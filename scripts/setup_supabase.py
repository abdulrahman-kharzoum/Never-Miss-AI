#!/usr/bin/env python3
"""
Script to set up Supabase tables for the chat application
"""
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client, Client

SUPABASE_URL = "https://yiarrshhxltesgoehqse.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpYXJyc2hoeGx0ZXNnb2VocXNlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODY1NjIzNCwiZXhwIjoyMDY0MjMyMjM0fQ.-ycD96zzx36rzH92Fu-h1IWF7oxL2WMjeTDmH_fu7L8"

def setup_tables():
    """Create the necessary tables in Supabase"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("🚀 Setting up Supabase tables...")
    
    # Read SQL file
    sql_file = os.path.join(os.path.dirname(__file__), 'setup_supabase_tables.sql')
    with open(sql_file, 'r') as f:
        sql_commands = f.read()
    
    try:
        # Execute SQL commands
        # Note: Supabase Python client doesn't support raw SQL execution directly
        # You need to run this SQL in Supabase SQL Editor manually
        
        print("⚠️  Please run the following SQL in your Supabase SQL Editor:")
        print("=" * 80)
        print(sql_commands)
        print("=" * 80)
        print("\n📍 Go to: https://supabase.com/dashboard/project/yiarrshhxltesgoehqse/editor")
        print("✅ Copy the SQL above and execute it in the SQL Editor")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    setup_tables()
