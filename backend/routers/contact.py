from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models.contact import ContactMessage
from schemas.contact import ContactMessageIn, ContactMessageOut

router = APIRouter()


@router.post("", response_model=ContactMessageOut, status_code=201)
async def submit_contact(
    data: ContactMessageIn,
    session: AsyncSession = Depends(get_db, scope="function"),
):
    msg = ContactMessage(name=data.name, email=data.email, message=data.message)
    session.add(msg)
    await session.flush()
    await session.refresh(msg)
    return ContactMessageOut.model_validate(msg)
