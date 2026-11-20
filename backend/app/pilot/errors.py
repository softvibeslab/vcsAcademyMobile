from fastapi import HTTPException


def ok(data=None, message=None):
    return {"success": True, "data": data, "message": message}


def fail(status, code, fields=None):
    raise HTTPException(status, detail={"code": code, "field_errors": fields or {}})
