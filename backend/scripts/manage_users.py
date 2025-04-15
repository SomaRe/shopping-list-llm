import argparse
from getpass import getpass # For securely typing password
import sys
import os

# Ensure the script can find the 'app' module
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

from app.database import SessionLocal
from app import crud, schemas, models
from app.core.security import get_password_hash

def add_user(db_session, username, password):
    """Adds a new user to the database."""
    user = crud.get_user_by_username(db_session, username=username)
    if user:
        print(f"Error: Username '{username}' already exists.")
        return
    user_in = schemas.UserCreate(username=username, password=password)
    try:
        created_user = crud.create_user(db_session, user=user_in)
        print(f"User '{created_user.username}' created successfully with ID {created_user.id}.")
    except Exception as e:
        print(f"Error creating user: {e}")
        db_session.rollback() # Rollback in case of error during commit

def list_users(db_session):
    """Lists all users in the database."""
    users = db_session.query(models.User).all()
    if not users:
        print("No users found.")
        return
    print("Users:")
    print("-" * 20)
    for user in users:
        print(f"ID: {user.id}, Username: {user.username}, Active: {user.is_active}")
    print("-" * 20)

def delete_user(db_session, username):
    """Deletes a user from the database."""
    user = crud.get_user_by_username(db_session, username=username)
    if not user:
        print(f"Error: User '{username}' not found.")
        return

    # Optional: Add confirmation prompt
    confirm = input(f"Are you sure you want to delete user '{username}'? (yes/no): ").lower()
    if confirm != 'yes':
        print("Deletion cancelled.")
        return

    try:
        print(f"Deleting user '{username}'...")
        db_session.delete(user)
        db_session.commit()
        print(f"User '{username}' deleted successfully.")
    except Exception as e:
        print(f"Error deleting user: {e}")
        db_session.rollback()

def main():
    parser = argparse.ArgumentParser(description="Manage users for the Grocery App.")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Add user command
    parser_add = subparsers.add_parser("add", help="Add a new user")
    parser_add.add_argument("username", help="Username for the new user")

    # List users command
    parser_list = subparsers.add_parser("list", help="List all users")

    # Delete user command
    parser_delete = subparsers.add_parser("delete", help="Delete a user")
    parser_delete.add_argument("username", help="Username of the user to delete")

    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.command == "add":
            password = getpass(f"Enter password for user '{args.username}': ")
            password_confirm = getpass("Confirm password: ")
            if password != password_confirm:
                print("Error: Passwords do not match.")
            elif not password:
                 print("Error: Password cannot be empty.")
            else:
                add_user(db, args.username, password)
        elif args.command == "list":
            list_users(db)
        elif args.command == "delete":
            delete_user(db, args.username)
        else:
            parser.print_help()
    finally:
        db.close()

if __name__ == "__main__":
    main()
