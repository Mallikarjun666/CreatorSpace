"""Run once:  python -m app.seed   (safe to re-run; it skips data that exists)."""
from datetime import date, timedelta

from sqlalchemy import select

from .database import Base, SessionLocal, engine
from .models import Brief, Creator, Tool, User
from .security import hash_password

TOOLS = ["Midjourney", "Runway", "Sora", "Pika", "ComfyUI", "ElevenLabs"]

# (name, headline, content_type, aspect_ratio, verified, workflow, tools)
CREATORS = [
    ("Aria Collins", "AI filmmaker", "Video", "9:16", True,
     "Script, stills, motion, edit. Short vertical ads built from Midjourney stills animated in Runway.",
     ["Midjourney", "Runway", "ElevenLabs"]),
    ("Dev Malhotra", "Generative designer", "Image", "1:1", False,
     "Prompt exploration, upscaling and manual cleanup for social image sets.",
     ["Midjourney", "ComfyUI"]),
    ("Lena Ortiz", "AI animator", "Animation", "16:9", True,
     "Storyboard, keyframes, interpolation and sound design for short explainers.",
     ["Runway", "Pika"]),
    ("Sam Okafor", "AI filmmaker", "Video", "16:9", True,
     "Cinematic product films generated in Sora and graded in post.",
     ["Sora", "Runway"]),
    ("Mei Tanaka", "Generative designer", "Image", "9:16", False,
     "Poster and story-format visuals with consistent style across a campaign.",
     ["Midjourney"]),
    ("Noah Becker", "AI animator", "Animation", "1:1", False,
     "Looping animated logos and social stickers.",
     ["Pika", "ComfyUI"]),
]

# (brand, title, description, content_type, aspect_ratio, style, budget, days_to_deadline, commercial_use)
BRIEFS = [
    ("Brightleaf Coffee", "Product launch video", "A 20-second launch film for our new cold brew.",
     "Video", "16:9", "Cinematic", 2500, 21, "Paid ads, 12 months"),
    ("Orbit Fitness", "Social video series", "Six short vertical clips for an app campaign.",
     "Video", "9:16", "Energetic", 1800, 14, "Social only, 6 months"),
    ("Lumen Skincare", "Campaign image set", "Ten still images for a seasonal product page.",
     "Image", "1:1", "Minimal, soft light", 1200, 30, "Web and print, 12 months"),
    ("Paperboat Travel", "Animated explainer", "A 30-second animated explainer about our trip planner.",
     "Animation", "16:9", "Playful", 2200, 28, "Paid ads, 6 months"),
]


def _ensure_user(db, email, name, role, company=None):
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(email=email, name=name, role=role, company=company,
                    password_hash=hash_password("demo12345"))
        db.add(user)
        db.flush()
    return user


def run():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        tools = {}
        for name in TOOLS:
            tool = db.scalar(select(Tool).where(Tool.name == name)) or Tool(name=name)
            db.add(tool)
            tools[name] = tool
        db.flush()

        if db.scalar(select(Creator.id).limit(1)) is None:
            for name, headline, ctype, ratio, verified, workflow, tool_names in CREATORS:
                db.add(Creator(name=name, headline=headline, content_type=ctype, aspect_ratio=ratio,
                               verified_tools=verified, workflow=workflow,
                               tools=[tools[t] for t in tool_names]))

        if db.scalar(select(Brief.id).limit(1)) is None:
            for brand, title, desc, ctype, ratio, style, budget, days, use in BRIEFS:
                db.add(Brief(brand_name=brand, title=title, description=desc, content_type=ctype,
                             aspect_ratio=ratio, style=style, budget=budget,
                             deadline=date.today() + timedelta(days=days), commercial_use=use))

        _ensure_user(db, "brand@demo.com", "Demo Brand", "brand", "Demo Co")
        creator_user = _ensure_user(db, "creator@demo.com", "Demo Creator", "creator")
        if creator_user.creator is None:
            db.add(Creator(user=creator_user, name="Demo Creator", headline="AI creator",
                           content_type="Video", aspect_ratio="16:9", verified_tools=False,
                           workflow="Sample workflow.", tools=[tools["Runway"]]))
        db.commit()
    print("Seed complete. Demo logins: creator@demo.com / brand@demo.com  (password: demo12345)")


if __name__ == "__main__":
    run()