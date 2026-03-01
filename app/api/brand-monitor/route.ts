import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// GET: 顧客のブランドモニター設定を取得
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customer_id");

    if (!customerId) {
      return NextResponse.json({ error: "customer_id required" }, { status: 400 });
    }

    const { data: configs } = await supabaseAdmin
      .from("brand_monitor_config")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      data: (configs || []).map((c) => ({
        id: c.id,
        brandName: c.brand_name,
        targetDomain: c.target_domain,
        industry: c.industry,
        customPrompts: c.custom_prompts,
        isActive: c.is_active,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    });
  } catch (e) {
    console.error("brand-monitor GET error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: ブランドモニター設定の追加・更新・削除
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, customerId, brandName, targetDomain, industry, customPrompts, configId, isActive } = body;

    if (!customerId) {
      return NextResponse.json({ error: "customerId required" }, { status: 400 });
    }

    // --- 追加 ---
    if (action === "add") {
      if (!brandName || !targetDomain) {
        return NextResponse.json({ error: "brandName and targetDomain required" }, { status: 400 });
      }

      const { data: inserted, error } = await supabaseAdmin
        .from("brand_monitor_config")
        .insert({
          customer_id: customerId,
          brand_name: brandName,
          target_domain: targetDomain,
          industry: industry || "",
          custom_prompts: customPrompts || null,
        })
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        data: {
          id: inserted.id,
          brandName: inserted.brand_name,
          targetDomain: inserted.target_domain,
          industry: inserted.industry,
          isActive: inserted.is_active,
        },
      });
    }

    // --- 更新 ---
    if (action === "update") {
      if (!configId) {
        return NextResponse.json({ error: "configId required" }, { status: 400 });
      }

      const updates: Record<string, unknown> = {};
      if (brandName !== undefined) updates.brand_name = brandName;
      if (targetDomain !== undefined) updates.target_domain = targetDomain;
      if (industry !== undefined) updates.industry = industry;
      if (customPrompts !== undefined) updates.custom_prompts = customPrompts;
      if (isActive !== undefined) updates.is_active = isActive;

      const { data: updated, error } = await supabaseAdmin
        .from("brand_monitor_config")
        .update(updates)
        .eq("id", configId)
        .eq("customer_id", customerId)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        data: {
          id: updated.id,
          brandName: updated.brand_name,
          targetDomain: updated.target_domain,
          industry: updated.industry,
          isActive: updated.is_active,
        },
      });
    }

    // --- 削除 ---
    if (action === "delete") {
      if (!configId) {
        return NextResponse.json({ error: "configId required" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("brand_monitor_config")
        .delete()
        .eq("id", configId)
        .eq("customer_id", customerId);

      if (error) throw error;

      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("brand-monitor POST error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
