"""
APScheduler-based notification engine.
- Polls plans table every minute
- Sends notifications at 1hr, 30min, 15min before plan_time
- Handles daily recurring tasks
- Inserts into `notifications` table (Supabase Realtime picks it up on frontend)
"""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.db.supabase import get_supabase
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="Asia/Dhaka")

DHAKA_TZ = ZoneInfo("Asia/Dhaka")


def start_scheduler():
    scheduler.add_job(
        check_and_notify,
        trigger="interval",
        minutes=1,
        id="notification_poller",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Notification scheduler started (Asia/Dhaka timezone)")


def stop_scheduler():
    scheduler.shutdown()


async def check_and_notify():
    """Check upcoming plans and send notifications at 1hr, 30min, 15min prior."""
    try:
        await _do_check_and_notify()
    except Exception as e:
        logger.warning(f"Notification check skipped: {e}")


async def _do_check_and_notify():
    sb = get_supabase()
    now = datetime.now(timezone.utc)

    # Fetch all incomplete, non-daily plans with a future plan_time
    result = sb.table("plans").select("*").eq("is_completed", False).eq("is_daily", False).execute()
    plans = result.data or []

    for plan in plans:
        if not plan.get("plan_time"):
            continue

        plan_time = datetime.fromisoformat(plan["plan_time"].replace("Z", "+00:00"))
        diff_minutes = (plan_time - now).total_seconds() / 60

        if 55 <= diff_minutes <= 65 and not plan.get("notif_1hr_sent"):
            _insert_notification(sb, plan["user_id"], plan["id"],
                                 f"Reminder: '{plan['title']}' is in 1 hour", "1hr")
            sb.table("plans").update({"notif_1hr_sent": True}).eq("id", plan["id"]).execute()

        if 25 <= diff_minutes <= 35 and not plan.get("notif_30min_sent"):
            _insert_notification(sb, plan["user_id"], plan["id"],
                                 f"Reminder: '{plan['title']}' is in 30 minutes", "30min")
            sb.table("plans").update({"notif_30min_sent": True}).eq("id", plan["id"]).execute()

        if 10 <= diff_minutes <= 20 and not plan.get("notif_15min_sent"):
            _insert_notification(sb, plan["user_id"], plan["id"],
                                 f"Reminder: '{plan['title']}' is in 15 minutes", "15min")
            sb.table("plans").update({"notif_15min_sent": True}).eq("id", plan["id"]).execute()

    await _check_daily_tasks(sb, now)


async def _check_daily_tasks(sb, now: datetime):
    """For daily tasks, send notifications 1hr, 30min, 15min before daily_time."""
    result = sb.table("plans").select("*").eq("is_daily", True).execute()
    plans = result.data or []

    dhaka_now = now.astimezone(DHAKA_TZ)

    for plan in plans:
        if not plan.get("daily_time"):
            continue

        # Build today's task time in Dhaka timezone, then convert to UTC for diff
        h, m = map(int, plan["daily_time"].split(":"))
        today_dhaka = dhaka_now.replace(hour=h, minute=m, second=0, microsecond=0)
        today_task_time = today_dhaka.astimezone(timezone.utc)

        # Reset sent flags at Dhaka midnight (new day)
        if dhaka_now.hour == 0 and dhaka_now.minute < 2:
            sb.table("plans").update({
                "notif_1hr_sent": False,
                "notif_30min_sent": False,
                "notif_15min_sent": False,
            }).eq("id", plan["id"]).execute()

        diff_minutes = (today_task_time - now).total_seconds() / 60

        if 55 <= diff_minutes <= 65 and not plan.get("notif_1hr_sent"):
            _insert_notification(sb, plan["user_id"], plan["id"],
                                 f"Daily reminder: '{plan['title']}' is in 1 hour", "1hr")
            sb.table("plans").update({"notif_1hr_sent": True}).eq("id", plan["id"]).execute()

        if 25 <= diff_minutes <= 35 and not plan.get("notif_30min_sent"):
            _insert_notification(sb, plan["user_id"], plan["id"],
                                 f"Daily reminder: '{plan['title']}' is in 30 minutes", "30min")
            sb.table("plans").update({"notif_30min_sent": True}).eq("id", plan["id"]).execute()

        if 10 <= diff_minutes <= 20 and not plan.get("notif_15min_sent"):
            _insert_notification(sb, plan["user_id"], plan["id"],
                                 f"Daily reminder: '{plan['title']}' is in 15 minutes", "15min")
            sb.table("plans").update({"notif_15min_sent": True}).eq("id", plan["id"]).execute()


def _insert_notification(sb, user_id: str, plan_id: str, message: str, notif_type: str):
    """Insert a notification row — Supabase Realtime broadcasts it to the frontend."""
    sb.table("notifications").insert({
        "user_id": user_id,
        "plan_id": plan_id,
        "message": message,
        "type": notif_type,
        "is_read": False,
    }).execute()
    logger.info(f"Notification [{notif_type}] → user {user_id}: {message}")
