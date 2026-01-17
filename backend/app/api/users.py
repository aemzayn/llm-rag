from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_users():
    """List all users (Admin only)"""
    # To be implemented
    return {"message": "List users endpoint - to be implemented"}


@router.get("/{user_id}")
async def get_user(user_id: int):
    """Get user by ID"""
    # To be implemented
    return {"message": f"Get user {user_id} endpoint - to be implemented"}


@router.patch("/{user_id}")
async def update_user(user_id: int):
    """Update user (Admin only)"""
    # To be implemented
    return {"message": f"Update user {user_id} endpoint - to be implemented"}


@router.delete("/{user_id}")
async def delete_user(user_id: int):
    """Delete user (Admin only)"""
    # To be implemented
    return {"message": f"Delete user {user_id} endpoint - to be implemented"}
