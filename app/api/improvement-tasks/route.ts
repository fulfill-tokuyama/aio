import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateWithGemini } from "@/lib/gemini";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

type TaskStatus = "pending" | "in_progress" | "completed";
type TaskCategory =
  | "structured_data"
  | "meta_tags"
  | "content"
  | "eeat"
  | "technical"
  | "other";

interface CreatePayload {
  action: "create";
  task: {
    title: string;
    description: string;
    category: TaskCategory;
    status?: TaskStatus;
    diagnosis_id: string;
  };
}

interface UpdatePayload {
  action: "update";
  task_id: string;
  updates: {
    status?: TaskStatus;
    completed_at?: string;
  };
}

interface AutoGeneratePayload {
  action: "auto_generate";
  diagnosis_id: string;
}

type PostPayload = CreatePayload | UpdatePayload | AutoGeneratePayload;

async function authenticateAndGetCustomer() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: customer, error: customerError } = await supabaseAdmin
    .from("customers")
    .select("id, status")
    .eq("supabase_user_id", user.id)
    .single();

  if (customerError || !customer) {
    return {
      error: NextResponse.json({ error: "Customer record not found" }, { status: 404 }),
    };
  }

  if (customer.status !== "active") {
    return {
      error: NextResponse.json(
        { error: "Active paid plan required" },
        { status: 403 }
      ),
    };
  }

  return { customer_id: customer.id as string };
}

export async function GET() {
  const auth = await authenticateAndGetCustomer();
  if ("error" in auth) return auth.error;

  const { data: tasks, error } = await supabaseAdmin
    .from("improvement_tasks")
    .select("*")
    .eq("customer_id", auth.customer_id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch tasks", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateAndGetCustomer();
  if ("error" in auth) return auth.error;

  let body: PostPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.action === "create") {
    return handleCreate(auth.customer_id, body);
  } else if (body.action === "update") {
    return handleUpdate(auth.customer_id, body);
  } else if (body.action === "auto_generate") {
    return handleAutoGenerate(auth.customer_id, body);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

async function handleCreate(customerId: string, body: CreatePayload) {
  const { task } = body;

  if (!task?.title || !task?.category || !task?.diagnosis_id) {
    return NextResponse.json(
      { error: "Missing required fields: title, category, diagnosis_id" },
      { status: 400 }
    );
  }

  const validCategories: TaskCategory[] = [
    "structured_data",
    "meta_tags",
    "content",
    "eeat",
    "technical",
    "other",
  ];
  if (!validCategories.includes(task.category)) {
    return NextResponse.json(
      { error: `Invalid category. Must be one of: ${validCategories.join(", ")}` },
      { status: 400 }
    );
  }

  const validStatuses: TaskStatus[] = ["pending", "in_progress", "completed"];
  const status = task.status || "pending";
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  const { data: newTask, error } = await supabaseAdmin
    .from("improvement_tasks")
    .insert({
      customer_id: customerId,
      diagnosis_id: task.diagnosis_id,
      title: task.title,
      description: task.description || "",
      category: task.category,
      status,
      completed_at: status === "completed" ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create task", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ task: newTask }, { status: 201 });
}

async function handleUpdate(customerId: string, body: UpdatePayload) {
  const { task_id, updates } = body;

  if (!task_id) {
    return NextResponse.json({ error: "Missing task_id" }, { status: 400 });
  }

  if (!updates || Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  // Verify the task belongs to this customer
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from("improvement_tasks")
    .select("id")
    .eq("id", task_id)
    .eq("customer_id", customerId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const validStatuses: TaskStatus[] = ["pending", "in_progress", "completed"];
  if (updates.status && !validStatuses.includes(updates.status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (updates.status) {
    updateData.status = updates.status;
    if (updates.status === "completed") {
      updateData.completed_at = new Date().toISOString();
    }
  }
  if (updates.completed_at !== undefined) {
    updateData.completed_at = updates.completed_at;
  }

  const { data: updatedTask, error } = await supabaseAdmin
    .from("improvement_tasks")
    .update(updateData)
    .eq("id", task_id)
    .eq("customer_id", customerId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update task", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ task: updatedTask });
}

async function handleAutoGenerate(customerId: string, body: AutoGeneratePayload) {
  const { diagnosis_id } = body;

  if (!diagnosis_id) {
    return NextResponse.json({ error: "Missing diagnosis_id" }, { status: 400 });
  }

  // customersテーブルからメールを取得し、leadsを経由して診断レポートを取得
  const { data: customerRecord } = await supabaseAdmin
    .from("customers")
    .select("email")
    .eq("id", customerId)
    .single();

  if (!customerRecord?.email) {
    return NextResponse.json({ error: "顧客情報が見つかりません" }, { status: 404 });
  }

  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select("id")
    .eq("email", customerRecord.email);

  if (!leads || leads.length === 0) {
    return NextResponse.json({ error: "診断データが見つかりません" }, { status: 404 });
  }

  const leadIds = leads.map((l: { id: string }) => l.id);
  const { data: diagnosis } = await supabaseAdmin
    .from("diagnosis_reports")
    .select("*")
    .in("lead_id", leadIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!diagnosis) {
    return NextResponse.json({ error: "診断レポートが見つかりません" }, { status: 404 });
  }

  const weaknesses = Array.isArray(diagnosis.weaknesses) ? diagnosis.weaknesses.join("\n") : "";
  const suggestions = Array.isArray(diagnosis.suggestions) ? diagnosis.suggestions.join("\n") : "";

  const prompt = `あなたはAIO/LLMO（AI検索最適化）の専門家です。以下の診断結果から、具体的な改善タスクをJSON配列で生成してください。

スコア: ${diagnosis.score}/100
弱点:
${weaknesses}

改善提案:
${suggestions}

各タスクは以下の形式で出力（JSON配列のみ、他のテキストは不要）:
[
  {
    "title": "タスク名（日本語、50文字以内）",
    "description": "具体的な実施内容（日本語、100文字程度）",
    "category": "structured_data" | "meta_tags" | "content" | "eeat" | "technical" | "other",
    "priority": "high" | "medium" | "low"
  }
]

弱点と提案を分析し、5〜10個の実行可能なタスクを優先度順に生成してください。`;

  let tasks: Array<{
    title: string;
    description: string;
    category: TaskCategory;
    priority: string;
  }>;

  try {
    const result = await generateWithGemini(prompt);
    const cleaned = result.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    tasks = JSON.parse(cleaned);

    if (!Array.isArray(tasks)) {
      throw new Error("Gemini response is not an array");
    }
  } catch (e) {
    return NextResponse.json(
      {
        error: "Failed to generate tasks from diagnosis",
        details: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 }
    );
  }

  const validCategories: TaskCategory[] = [
    "structured_data",
    "meta_tags",
    "content",
    "eeat",
    "technical",
    "other",
  ];

  const tasksToInsert = tasks.map((t) => ({
    customer_id: customerId,
    diagnosis_id,
    title: (t.title || "Untitled task").slice(0, 100),
    description: t.description || "",
    category: validCategories.includes(t.category) ? t.category : "other",
    priority: ["high", "medium", "low"].includes(t.priority) ? t.priority : "medium",
    status: "pending" as const,
  }));

  const { data: insertedTasks, error: insertError } = await supabaseAdmin
    .from("improvement_tasks")
    .insert(tasksToInsert)
    .select();

  if (insertError) {
    return NextResponse.json(
      { error: "Failed to insert generated tasks", details: insertError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ tasks: insertedTasks }, { status: 201 });
}
