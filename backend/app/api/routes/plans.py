"""
GET    /plans/{user_id}           — list all plans
POST   /plans/{user_id}           — create manual plan
PATCH  /plans/{plan_id}/complete  — mark as completed
DELETE /plans/{plan_id}           — delete a plan
"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import PlanCreate
from app.db.supabase import get_supabase

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("/{user_id}")
async def list_plans(user_id: str, include_completed: bool = False):
    """List plans for a user. Optionally include completed ones."""
    sb = get_supabase()
    query = (
        sb.table("plans")
        .select("*")
        .eq("user_id", user_id)
        .order("plan_time", asc=True, nullsfirst=False)
    )
    if not include_completed:
        query = query.eq("is_completed", False)

    result = query.execute()
    return result.data or []


@router.post("/{user_id}")
async def create_plan(user_id: str, body: PlanCreate):
    """Manually create a one-time or daily recurring plan."""
    sb = get_supabase()

    if not body.is_daily and not body.plan_time:
        raise HTTPException(status_code=400, detail="plan_time is required for one-time plans")
    if body.is_daily and not body.daily_time:
        raise HTTPException(status_code=400, detail="daily_time (HH:MM) is required for daily plans")

    result = sb.table("plans").insert({
        "user_id": user_id,
        "title": body.title,
        "description": body.description,
        "plan_time": body.plan_time.isoformat() if body.plan_time else None,
        "is_daily": body.is_daily,
        "daily_time": body.daily_time,
        "conversation_id": None,  # manual plan — not from a recording
    }).execute()

    return result.data[0]


@router.patch("/{plan_id}/complete")
async def complete_plan(plan_id: str):
    """Mark a plan as completed."""
    sb = get_supabase()
    result = (
        sb.table("plans")
        .update({"is_completed": True})
        .eq("id", plan_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Plan not found")
    return result.data[0]


@router.delete("/{plan_id}")
async def delete_plan(plan_id: str):
    sb = get_supabase()
    sb.table("plans").delete().eq("id", plan_id).execute()
    return {"deleted": True}
