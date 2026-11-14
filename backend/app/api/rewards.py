import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_owned_child
from app.database import get_db
from app.game.levels import level_info
from app.game.missions import MISSION_CODES
from app.models import Badge, Certificate, Child, EarnedBadge
from app.services.certificate import build_certificate_pdf
from app.services.progression import completed_mission_codes, evaluate_badges, total_xp

router = APIRouter(tags=["Rewards & certificates"])


def badge_dict(b: Badge) -> dict:
    return {"code": b.code, "name": b.name, "description": b.description, "how_to_earn": b.how_to_earn,
            "icon": b.icon, "color": b.color, "xp_bonus": b.xp_bonus}


@router.get("/api/badges", summary="All badges that can be earned")
def all_badges(db: Session = Depends(get_db)):
    return [badge_dict(b) for b in db.scalars(select(Badge).order_by(Badge.order_index))]


@router.get("/api/children/{child_id}/badges", summary="Earned and locked badges")
def child_badges(child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    # Re-check in case content changed (no-op if nothing new)
    if evaluate_badges(db, child.id):
        db.commit()
    earned = {e.badge_id: e.earned_at for e in db.scalars(select(EarnedBadge).where(EarnedBadge.child_id == child.id))}
    out = []
    for b in db.scalars(select(Badge).order_by(Badge.order_index)):
        out.append({**badge_dict(b), "earned": b.id in earned, "earned_at": earned.get(b.id)})
    return out


def _cert_status(db: Session, child: Child) -> dict:
    done = completed_mission_codes(db, child.id)
    cert = db.scalar(select(Certificate).where(Certificate.child_id == child.id))
    return {
        "eligible": set(MISSION_CODES) <= done,
        "missions_completed": len(done & set(MISSION_CODES)),
        "missions_required": len(MISSION_CODES),
        "issued": cert is not None,
        "certificate_code": cert.certificate_code if cert else None,
        "issued_at": cert.issued_at if cert else None,
    }


@router.get("/api/children/{child_id}/certificate", summary="Certificate eligibility and status")
def certificate_status(child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    return _cert_status(db, child)


@router.post("/api/children/{child_id}/certificate", summary="Generate (issue) the certificate")
def issue_certificate(child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    st = _cert_status(db, child)
    if not st["eligible"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN,
                            detail=f"Complete all {st['missions_required']} training missions to earn your "
                                   f"certificate. You have finished {st['missions_completed']}.")
    cert = db.scalar(select(Certificate).where(Certificate.child_id == child.id))
    xp = total_xp(db, child.id)
    lvl = level_info(xp)["level_name"]
    if cert is None:
        cert = Certificate(child_id=child.id, certificate_code="AKA-" + secrets.token_hex(4).upper(),
                           level_name=lvl, total_xp=xp)
        db.add(cert)
    else:  # refresh with latest achievements
        cert.level_name, cert.total_xp = lvl, xp
    db.commit()
    return _cert_status(db, child)


@router.get("/api/children/{child_id}/certificate/pdf", summary="Download the certificate PDF",
            response_class=Response, responses={200: {"content": {"application/pdf": {}}}})
def certificate_pdf(child: Child = Depends(get_owned_child), db: Session = Depends(get_db)):
    cert = db.scalar(select(Certificate).where(Certificate.child_id == child.id))
    if cert is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Generate your certificate first.")
    pdf = build_certificate_pdf(child.nickname, cert.level_name, cert.total_xp, cert.issued_at,
                                cert.certificate_code, len(MISSION_CODES))
    safe = "".join(ch for ch in child.nickname if ch.isalnum()) or "astronaut"
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="Junior-Astronaut-{safe}.pdf"'})
