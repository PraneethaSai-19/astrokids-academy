from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_owned_child
from app.database import get_db
from app.models import Child, Planet, PlanetVisit
from app.services.progression import award_xp, evaluate_badges, reward_summary, total_xp, try_daily

router = APIRouter(tags=["Planets"])


def planet_dict(p: Planet) -> dict:
    return {c: getattr(p, c) for c in (
        "id", "slug", "name", "kind", "order_index", "tagline", "description", "fun_facts",
        "distance_from_sun", "distance_million_km", "temperature", "diameter_km", "size_comparison",
        "moons", "day_length", "year_length", "color", "xp_reward")}


def _get_planet(db: Session, slug: str) -> Planet:
    p = db.scalar(select(Planet).where(Planet.slug == slug))
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Planet not found.")
    return p


@router.get("/api/planets", summary="All planets (and the Sun)")
def list_planets(db: Session = Depends(get_db)):
    return [planet_dict(p) for p in db.scalars(select(Planet).order_by(Planet.order_index))]


@router.get("/api/planets/{slug}", summary="Planet details")
def get_planet(slug: str, db: Session = Depends(get_db)):
    return planet_dict(_get_planet(db, slug))


@router.get("/api/children/{child_id}/planets/visited", summary="Planets this child has explored")
def visited(child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    rows = db.execute(select(Planet.slug, PlanetVisit.visited_at)
                      .join(PlanetVisit, PlanetVisit.planet_id == Planet.id)
                      .where(PlanetVisit.child_id == child.id)).all()
    return [{"slug": s, "visited_at": v} for s, v in rows]


@router.post("/api/children/{child_id}/planets/{slug}/explore", summary="Mark a planet as explored (XP once)")
def explore(slug: str, child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    planet = _get_planet(db, slug)
    before = total_xp(db, child.id)
    first = db.scalar(select(PlanetVisit.id).where(PlanetVisit.child_id == child.id,
                                                   PlanetVisit.planet_id == planet.id)) is None
    xp = 0
    if first:
        db.add(PlanetVisit(child_id=child.id, planet_id=planet.id))
        db.flush()
        xp = award_xp(db, child.id, "planet", f"planet:{planet.slug}", planet.xp_reward,
                      f"Explored {planet.name}")
    daily = try_daily(db, child.id, "planet")
    badges = evaluate_badges(db, child.id)
    db.commit()
    return {"planet": planet.slug, "first_visit": first,
            **reward_summary(db, child, before, xp, badges, daily)}
