import dotenv
import os
import asyncio
import time
import requests
from typing import Dict, Any
from mcp import StdioServerParameters
from pipecat.services.mcp_service import MCPClient
# function calling
from pipecat.adapters.schemas.function_schema import FunctionSchema
from pipecat.adapters.schemas.tools_schema import AdapterType, ToolsSchema

from pipecat.services.llm_service import FunctionCallParams
from src.services.client import getSodularClient

dotenv.load_dotenv(override=True)


def get_request_tool_schema():
    """
    Schema for the send_user_request function
    
    The function will create a new request in the database with the following structure:
    {
        chatId: session_id, // The chat session id
    name: name, // The name of the request
    description: description, // The description of the request
    userId: user.uid, // The user id
    userName: user.data.fields?.displayName || user.data.username || 'User', // The user name
    createdAt: Date.now(), // The created at timestamp
    label: 'low' | 'normal' | 'urgent', // The label priority of the request
    status: 'ongoing', 'failed', 'done', 'cancelled' // The status of the request
    """

    return  FunctionSchema(
        name= "send_user_request",
        description= "To send user request to the database",
        properties= {
            "name": {
                "type": "string",
                "description": "The short name of the request."
            },
            "description": {
                "type": "string",
                "description": "The user request description."
            },
            "label": {
                "type": "string",
                "description": "The priority level of the request: low | normal | urgent",
                "enum": ["low", "normal", "urgent"]
            }  
        },
        required=["description", "label", "name"]
    )


def get_send_user_request_function(data = {}):
    """Get the send_user_request function with proper error handling"""

    database_id = data.get("database_id", None)
    token = data.get("token", None)
    session_id = data.get("session_id", None)
    user = data.get("user", {})

    async def send_user_request(params: FunctionCallParams):
        """Send user request to the database"""
        print("🚀 send_user_request function called!")
        print(f"📊 Function arguments: {params.arguments}")
        # print(f"🔧 Function data: {data}")
        
        try:
            # Validate required arguments
            if not params.arguments.get("description") or not params.arguments.get("label") or not params.arguments.get("name"):
                print("❌ Missing required arguments")
                await params.result_callback(
                    {"error": "Invalid arguments - name, description, and label are required"}
                )
                return
            
            print("✅ Arguments validation passed")
            
            # Validate required data
            if not database_id or not token or not session_id:
                print(f"❌ Missing required configuration: database_id={database_id}, token={bool(token)}, session_id={session_id}")
                await params.result_callback(
                    {"error": "Missing technical configuration"}
                )
                return
            
            print("✅ Configuration validation passed")
            
            # If user data is empty, log a warning
            if not user or not user.get('uid') or user.get('uid') == 'unknown':
                print("⚠️ User data is empty or invalid, using fallback user")
                await params.result_callback(
                    {"error": "Missing technical configuration"}
                )
                return
            else:
                print(f"✅ User data provided: {user.get('uid')}")
            
            # Get Sodular client from the service
            print("🔌 Getting Sodular client from service...")
            sodular_client = await getSodularClient()
            
            if not sodular_client:
                print("❌ Failed to get Sodular client from service")
                await params.result_callback(
                    {"error": "Missing technical configuration"}
                )
                return
            
            print("✅ Sodular client obtained successfully")
            
            # Set database context and authentication token
            print(f"🎯 Setting database context: {database_id}")
            sodular_client.use(database_id)
            print(f"🔑 Setting authentication token: {token[:10]}...")
            sodular_client.setToken(token)
            print("✅ Database context and token set")
            
            # Get the requests table ID by querying the tables
            # We'll look for a table with name "requests" or similar
            print(f"🔍 Searching for requests table in database: {database_id}")
            
            # Use tables.get like in JavaScript implementation with correct filter
            tables_response = await sodular_client.tables.get({
                'filter': {
                    'data.name': 'requests'  # Correct nested structure for table name
                }
            })
            
            print(f"📊 Tables response: {tables_response}")
            
            if tables_response.get('data'):
                # Handle single table response (not array)
                if isinstance(tables_response['data'], dict):
                    table_data = tables_response['data']
                    request_table_id = table_data.get('uid')
                    table_name = table_data.get('data', {}).get('name', 'unnamed')
                    print(f"✅ Found requests table: {table_name} (ID: {request_table_id})")
                # Handle array response
                elif isinstance(tables_response['data'], list) and len(tables_response['data']) > 0:
                    request_table_id = tables_response['data'][0].get('uid') 
                    table_name = tables_response['data'][0].get('data', {}).get('name', 'unnamed')
                    print(f"✅ Found requests table: {table_name} (ID: {request_table_id})")
                else:
                    print("❌ No valid table data found")
                    await params.result_callback(
                        {"error": "No valid table data found"}
                    )
                    return
                
                # Validate that we actually got a table ID
                if not request_table_id:
                    print("❌ Could not determine table ID from response")
                    await params.result_callback(
                        {"error": "Could not determine table ID from response"}
                    )
                    return
            else:
                print("❌ No requests table found in database")
                await params.result_callback(
                    {"error": "No requests table found in database"}
                )
                return
            
            print(f"🎯 Using table ID: {request_table_id}")
            
            # Create the request using the ref API
            print(f"🔗 Creating ref API for table: {request_table_id}")
            ref_api = getattr(sodular_client.ref, 'from')(request_table_id)
            print(f"✅ Ref API created successfully")
            
            # Validate ref API was created
            if not ref_api:
                print("❌ Failed to create ref API")
                await params.result_callback(
                    {"error": "Failed to create ref API for table operations"}
                )
                return

            # Check if the request already exists
            print(f"🔍 Checking if request already exists: {params.arguments['name']}")
            existing_request = await ref_api.get({
                "filter": {
                    "data.name": params.arguments["name"]
                }
            })

            print(f"📊 Existing request: {existing_request}")

            if existing_request.get('data') and existing_request['data'].get('uid'):
                print("❌ Request already exists")
                await params.result_callback(
                    {"success": "Request already exists, wait for the agent to instruct your request."}
                )
                return
            
            # Prepare request data
            request_data = {
               "chatId": session_id,
               "name": params.arguments["name"],
               "description": params.arguments["description"],
               "label": params.arguments["label"],
                "userId": user.get("uid", "unknown"),
                "userName": user.get("data", {}).get("fields", {}).get("displayName") or user.get("data", {}).get("username") or "User",
                "createdAt": int(time.time() * 1000),  # Current timestamp in milliseconds (Unix timestamp)
                "status": "ongoing"
            }
            
            print(f"📝 Request data to create: {request_data}")
            
            # Create the request in the database
            print("🚀 Creating request in database...")
            create_response = await ref_api.create({
                "data": request_data
            })
            
            print(f"📊 Create response: {create_response}")
            
            if create_response.get('data'):
                request_id =  create_response['data'].get('uid') 
                print(f"✅ Request created successfully with ID: {request_id}")
                await params.result_callback(
                        {"success": "Request created successfully", "requestName": request_data.get("name")}
                )
            else:
                error_msg = create_response.get('error', 'Unknown error')
                print(f"❌ Failed to create request: {error_msg}")
                await params.result_callback(
                    {"error": "Technical error"}
                )
            
            # Note: Don't close the client as it's managed by the service
            print("🎉 send_user_request completed successfully!")
            
        except Exception as error:
            print(f"❌ Unexpected error in send_user_request: {error}")
            import traceback
            traceback.print_exc()
            await params.result_callback(
                    {"error": "Technical error"}
                )
        finally:
            print("🏁 send_user_request function execution completed")

    return send_user_request



def get_tools_schema(data = {}):

    search_tool = {"google_search": {}}
    tools_schema = ToolsSchema(
        standard_tools=[get_request_tool_schema()],
        custom_tools={
            AdapterType.GEMINI:[search_tool]
        }
    )

    return tools_schema

def set_tools_functions(llm, data = {}, task = None):
    """Register tool functions with the LLM"""
    print("🔧 Setting up tools functions...")
    print(f"📊 Data passed to tools: {data}")
    
    try:
        # Validate required data
        required_fields = ['database_id', 'token', 'session_id', 'user']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            print(f"⚠️ Warning: Missing required fields: {missing_fields}")
            print("📝 Note: These fields will need to be provided when calling the function")
        
        # Get the function instance
        send_user_request_func = get_send_user_request_function(data)
        print("✅ send_user_request function created")
        
        # Register the function with the LLM
        print("📝 Registering send_user_request function with LLM...")
        llm.register_function("send_user_request", send_user_requestsss_func)
        print("✅ send_user_request function registered successfully")
        
        print("🎉 All tool functions registered successfully!")
        
    except Exception as error:
        print(f"❌ Error setting up tools functions: {error}")
        import traceback
        traceback.print_exc()
