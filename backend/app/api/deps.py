from sqlalchemy.orm import Session
from app.database import SessionLocal
from fastapi import Depends, HTTPException, status

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
