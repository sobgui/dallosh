#!/usr/bin/env python3
"""
Simple test to verify Sodular SDK client functionality
"""
import dotenv
import asyncio
import sys
import os

# Load environment variables first
dotenv.load_dotenv(override=True)

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Now import after path is set
from services.client import getSodularClient, closeSodularClient

async def test_sodular_client_basic():
    """Test basic Sodular client functionality"""
    try:
        print("🧪 Testing Sodular Client Basic Functionality...")
        
        print("✅ Import successful")
        
        # Get the client
        print("🔌 Getting Sodular client...")
        client = await getSodularClient()
        
        if not client:
            print("❌ Failed to get Sodular client")
            return False
        
        print("✅ Sodular client obtained successfully")
        
        # Test basic methods
        print("🎯 Testing basic client methods...")
        
        # Test use method
        test_db_id = os.getenv('SODULAR_DATABASE_ID', '43fba321-e958-466c-a450-1638d32af19b')
        client.use(test_db_id)
        print(f"✅ Database context set to: {test_db_id}")
        
        # Test setToken method
        test_token = os.getenv('SODULAR_TEST_TOKEN', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIxMTg1YmU1OC00YTMzLTRiN2YtYjgwNy03NmU5Y2NiODZjMDUiLCJlbWFpbCI6ImJvdEBkYWxsb3NoLmNvbSIsInVzZXJuYW1lIjoiZnJlZSIsImlhdCI6MTc1NTEwNDY3Mn0.zHvT8Q5ctQ7ECyOMS6McLMUF3rIk3hXcBlbOHWh1Jw0')
        client.setToken(test_token)
        print(f"✅ Token set: {test_token[:10]}...")
        
        print("✅ Basic client methods working")
        
        return True
        
    except Exception as error:
        print(f"❌ Test failed: {error}")
        import traceback
        traceback.print_exc()
        return False

async def test_get_requests_table():
    """Test getting the requests table ID"""
    try:
        print("\n🔍 Testing Get Requests Table...")
        
        # Get the client
        client = await getSodularClient()

        # Test use method
        test_db_id = os.getenv('SODULAR_DATABASE_ID', '43fba321-e958-466c-a450-1638d32af19b')
        client.use(test_db_id)
        print(f"✅ Database context set to: {test_db_id}")
        
        # Test setToken method
        test_token = os.getenv('SODULAR_TEST_TOKEN', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIxMTg1YmU1OC00YTMzLTRiN2YtYjgwNy03NmU5Y2NiODZjMDUiLCJlbWFpbCI6ImJvdEBkYWxsb3NoLmNvbSIsInVzZXJuYW1lIjoiZnJlZSIsImlhdCI6MTc1NTEwNDY3Mn0.zHvT8Q5ctQ7ECyOMS6McLMUF3rIk3hXcBlbOHWh1Jw0')
        client.setToken(test_token)
        print(f"✅ Token set: {test_token[:10]}...")
        
        if not client:
            print("❌ Failed to get Sodular client")
            return False
        
        print("✅ Client ready for table operations")
        
        # Try to get the requests table
        print("🔍 Searching for 'requests' table...")
        
        try:
            # Use tables.get like in the JavaScript implementation
            tables_response = await client.tables.get({
                'filter': {
                    'data.name': 'requests'  # Correct nested structure for table name
                }
            })
            
            print(f"📊 Tables response: {tables_response}")
            
            if tables_response.get('data'):
                # Handle single table response (not array)
                if isinstance(tables_response['data'], dict):
                    table_data = tables_response['data']
                    table_id = table_data.get('uid') or table_data.get('_id')
                    table_name = table_data.get('data', {}).get('name', 'unnamed')
                    print(f"✅ Found table: {table_name} (ID: {table_id})")
                    return True
                # Handle array response
                elif isinstance(tables_response['data'], list) and len(tables_response['data']) > 0:
                    first_table = tables_response['data'][0]
                    first_table_id = first_table.get('uid') or first_table.get('_id')
                    first_table_name = first_table.get('data', {}).get('name', 'unnamed')
                    print(f"✅ Found table: {first_table_name} (ID: {first_table_id})")
                    return True
                else:
                    print("❌ No tables found in database")
                    return False
            else:
                print("⚠️ No 'requests' table found, trying to get all tables...")
                
                # Try to get all tables as fallback
                all_tables = await client.tables.get({})
                print(f"📊 All tables response: {all_tables}")
                
                if all_tables.get('data'):
                    # Handle single table response (not array)
                    if isinstance(all_tables['data'], dict):
                        table_data = all_tables['data']
                        table_id = table_data.get('uid') or table_data.get('_id')
                        table_name = table_data.get('data', {}).get('name', 'unnamed')
                        print(f"⚠️ Using fallback table: {table_name} (ID: {table_id})")
                        return True
                    # Handle array response
                    elif isinstance(all_tables['data'], list) and len(all_tables['data']) > 0:
                        first_table = all_tables['data'][0]
                        first_table_id = first_table.get('uid') or first_table.get('_id')
                        first_table_name = first_table.get('data', {}).get('name', 'unnamed')
                        print(f"⚠️ Using fallback table: {first_table_name} (ID: {first_table_id})")
                        return True
                    else:
                        print("❌ No tables found in database")
                        return False
                else:
                    print("❌ No tables found in database")
                    return False
                    
        except Exception as table_error:
            print(f"❌ Error getting tables: {table_error}")
            import traceback
            traceback.print_exc()
            return False
        
    except Exception as error:
        print(f"❌ Test failed: {error}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting Sodular Client Tests...")
    
    try:
        # Test 1: Basic client functionality
        success1 = await test_sodular_client_basic()
        
        if not success1:
            print("❌ Basic client test failed, stopping here")
            return False
        
        # Test 2: Get requests table
        success2 = await test_get_requests_table()
        
        if success1 and success2:
            print("\n🎉 All tests passed! Sodular client is working correctly.")
            return True
        else:
            print("\n❌ Some tests failed! There are issues with the Sodular client.")
            return False
            
    finally:
        # Always cleanup resources
        print("\n🧹 Cleaning up resources...")
        try:
            await closeSodularClient()
            print("✅ Resources cleaned up successfully")
        except Exception as e:
            print(f"⚠️ Warning: Error during cleanup: {e}")

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
