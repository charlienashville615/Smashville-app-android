#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Smashville Dating App
Testing all endpoints after major refactoring to modular structure
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend env
BASE_URL = "https://swipe-venue-test.preview.emergentagent.com/api"

class SmashvilleAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
        self.created_users = []
        self.created_venues = []
        self.active_checkins = []
        self.matches = []
        self.admin_user_id = None
        
    def log_result(self, test_name, success, message="", response=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response and not success:
            print(f"   Response: {response.text[:200] if hasattr(response, 'text') else str(response)}")
        print()
        
        if success:
            self.test_results["passed"] += 1
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append({
                "test": test_name,
                "message": message,
                "response": response.text[:500] if response and hasattr(response, 'text') else str(response)
            })
    
    def test_auth_endpoints(self):
        """Test Authentication endpoints"""
        print("=== TESTING AUTH ENDPOINTS ===")
        
        # Use random timestamp to ensure unique emails
        import time
        timestamp = str(int(time.time()))
        
        # Test 1: Signup with valid data
        signup_data = {
            "email": f"testuser{timestamp}@test.com",
            "password": "pass123",
            "displayName": "Test User",
            "username": f"testuser{timestamp}", 
            "agreedToTerms": True
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/signup", json=signup_data)
            if response.status_code == 200:  # Backend returns 200, not 201
                user_data = response.json()
                if "id" in user_data:
                    self.created_users.append(user_data["id"])
                    self.log_result("Auth Signup", True, f"Created user with ID: {user_data['id']}")
                else:
                    self.log_result("Auth Signup", False, "No user ID returned", response)
            else:
                self.log_result("Auth Signup", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Auth Signup", False, f"Exception: {str(e)}")
        
        # Test 2: Signup duplicate email (should fail)
        try:
            response = requests.post(f"{self.base_url}/auth/signup", json=signup_data)
            if response.status_code == 400:
                self.log_result("Auth Signup Duplicate Email Validation", True, "Correctly rejected duplicate email")
            else:
                self.log_result("Auth Signup Duplicate Email Validation", False, f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Auth Signup Duplicate Email Validation", False, f"Exception: {str(e)}")
        
        # Test 3: Signup without terms agreement (should fail)
        signup_no_terms = signup_data.copy()
        signup_no_terms["agreedToTerms"] = False
        signup_no_terms["email"] = "testuser2@test.com"
        signup_no_terms["username"] = "testuser2"
        
        try:
            response = requests.post(f"{self.base_url}/auth/signup", json=signup_no_terms)
            if response.status_code == 400:
                self.log_result("Auth Signup Terms Validation", True, "Correctly rejected without terms agreement")
            else:
                self.log_result("Auth Signup Terms Validation", False, f"Status: {response.status_code}", response)
        except Exception as e:
            self.log_result("Auth Signup Terms Validation", False, f"Exception: {str(e)}")
        
        # Test 4: Login with valid credentials
        login_data = {
            "email": "testuser@test.com",
            "password": "pass123"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 200:
                user_data = response.json()
                if "id" in user_data and user_data["email"] == "testuser@test.com":
                    self.log_result("Auth Login", True, f"Successfully logged in user: {user_data['id']}")
                else:
                    self.log_result("Auth Login", False, "Invalid login response data", response)
            else:
                self.log_result("Auth Login", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Auth Login", False, f"Exception: {str(e)}")

    def test_users_endpoints(self):
        """Test Users endpoints"""
        print("=== TESTING USERS ENDPOINTS ===")
        
        if not self.created_users:
            self.log_result("Users Tests", False, "No test users available")
            return
            
        user_id = self.created_users[0]
        
        # Test 1: Get user by ID
        try:
            response = requests.get(f"{self.base_url}/users/{user_id}")
            if response.status_code == 200:
                user_data = response.json()
                if user_data.get("id") == user_id:
                    self.log_result("Users Get by ID", True, f"Retrieved user data for: {user_id}")
                else:
                    self.log_result("Users Get by ID", False, "User ID mismatch in response", response)
            else:
                self.log_result("Users Get by ID", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Users Get by ID", False, f"Exception: {str(e)}")
        
        # Test 2: Update user profile
        update_data = {"bio": "Updated bio for testing"}
        try:
            response = requests.put(f"{self.base_url}/users/{user_id}", json=update_data)
            if response.status_code == 200:
                self.log_result("Users Update Profile", True, "Successfully updated user bio")
            else:
                self.log_result("Users Update Profile", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Users Update Profile", False, f"Exception: {str(e)}")
        
        # Test 3: Regenerate AI texts
        try:
            response = requests.post(f"{self.base_url}/users/{user_id}/regenerate-ai")
            if response.status_code == 200:
                ai_data = response.json()
                if "aiTexts" in ai_data:
                    self.log_result("Users Regenerate AI", True, "Successfully regenerated AI texts")
                else:
                    self.log_result("Users Regenerate AI", False, "No aiTexts in response", response)
            else:
                self.log_result("Users Regenerate AI", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Users Regenerate AI", False, f"Exception: {str(e)}")
        
        # Test 4: Update status
        status_data = {"status": "feeling good"}
        try:
            response = requests.post(f"{self.base_url}/users/{user_id}/status", json=status_data)
            if response.status_code == 200:
                self.log_result("Users Update Status", True, "Successfully updated user status")
            else:
                self.log_result("Users Update Status", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Users Update Status", False, f"Exception: {str(e)}")
        
        # Test 5: Set emergency PIN
        pin_data = {"pin": "1234"}
        try:
            response = requests.post(f"{self.base_url}/users/{user_id}/emergency-pin", json=pin_data)
            if response.status_code == 200:
                self.log_result("Users Set Emergency PIN", True, "Successfully set emergency PIN")
            else:
                self.log_result("Users Set Emergency PIN", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Users Set Emergency PIN", False, f"Exception: {str(e)}")
        
        # Test 6: Get AI status suggestions
        try:
            response = requests.get(f"{self.base_url}/status/ai-suggestions")
            if response.status_code == 200:
                suggestions = response.json()
                if "suggestions" in suggestions:
                    self.log_result("Users AI Status Suggestions", True, f"Got {len(suggestions['suggestions'])} suggestions")
                else:
                    self.log_result("Users AI Status Suggestions", False, "No suggestions in response", response)
            else:
                self.log_result("Users AI Status Suggestions", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Users AI Status Suggestions", False, f"Exception: {str(e)}")

    def test_venues_endpoints(self):
        """Test Venues endpoints"""
        print("=== TESTING VENUES ENDPOINTS ===")
        
        # Test 1: Get all venues
        try:
            response = requests.get(f"{self.base_url}/venues")
            if response.status_code == 200:
                venues = response.json()
                if len(venues) == 32:
                    self.log_result("Venues Get All", True, f"Retrieved all {len(venues)} venues")
                    # Store first venue for other tests
                    if venues:
                        self.created_venues = [venues[0]["id"]]
                else:
                    self.log_result("Venues Get All", False, f"Expected 32 venues, got {len(venues)}", response)
            else:
                self.log_result("Venues Get All", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Venues Get All", False, f"Exception: {str(e)}")
        
        # Test 2: Get single venue
        if self.created_venues:
            venue_id = self.created_venues[0]
            try:
                response = requests.get(f"{self.base_url}/venues/{venue_id}")
                if response.status_code == 200:
                    venue_data = response.json()
                    if venue_data.get("id") == venue_id:
                        self.log_result("Venues Get Single", True, f"Retrieved venue: {venue_data.get('name', 'Unknown')}")
                    else:
                        self.log_result("Venues Get Single", False, "Venue ID mismatch", response)
                else:
                    self.log_result("Venues Get Single", False, f"Status code: {response.status_code}", response)
            except Exception as e:
                self.log_result("Venues Get Single", False, f"Exception: {str(e)}")
        
        # Test 3: Create new venue
        new_venue_data = {
            "name": "Test Venue API",
            "address": "123 Test Street, Nashville, TN",
            "type": "Bar",  # Changed from "category" to "type"
            "latitude": 36.1627,
            "longitude": -86.7816,
            "description": "Test venue created by API testing"
        }
        
        try:
            response = requests.post(f"{self.base_url}/venues", json=new_venue_data)
            if response.status_code == 200:  # Backend returns 200, not 201
                venue_data = response.json()
                if "id" in venue_data:
                    self.created_venues.append(venue_data["id"])
                    self.log_result("Venues Create", True, f"Created new venue with ID: {venue_data['id']}")
                else:
                    self.log_result("Venues Create", False, "No venue ID returned", response)
            else:
                self.log_result("Venues Create", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Venues Create", False, f"Exception: {str(e)}")

    def test_checkins_endpoints(self):
        """Test Check-ins endpoints"""
        print("=== TESTING CHECKINS ENDPOINTS ===")
        
        if not self.created_users or not self.created_venues:
            self.log_result("Check-ins Tests", False, "No test users or venues available")
            return
        
        user_id = self.created_users[0]
        venue_id = self.created_venues[0]
        
        # Test 1: Check in with GPS
        checkin_data = {
            "userId": user_id,
            "venueId": venue_id,
            "latitude": 36.1627,
            "longitude": -86.7816
        }
        
        try:
            response = requests.post(f"{self.base_url}/checkins", json=checkin_data)
            if response.status_code in [200, 201]:  # Accept both status codes
                checkin_data_response = response.json()
                if "id" in checkin_data_response:
                    self.active_checkins.append(checkin_data_response["id"])
                    self.log_result("Check-ins Create", True, f"Successfully checked in user to venue")
                else:
                    self.log_result("Check-ins Create", False, "No check-in ID returned", response)
            else:
                self.log_result("Check-ins Create", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Check-ins Create", False, f"Exception: {str(e)}")
        
        # Test 2: Get user's active check-in
        try:
            response = requests.get(f"{self.base_url}/checkins/user/{user_id}")
            if response.status_code == 200:
                checkin_data = response.json()
                if checkin_data.get("userId") == user_id:
                    self.log_result("Check-ins Get User Active", True, "Retrieved user's active check-in")
                else:
                    self.log_result("Check-ins Get User Active", False, "Invalid check-in data", response)
            else:
                self.log_result("Check-ins Get User Active", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Check-ins Get User Active", False, f"Exception: {str(e)}")
        
        # Test 3: Get venue check-ins
        try:
            response = requests.get(f"{self.base_url}/checkins/venue/{venue_id}")
            if response.status_code == 200:
                checkins = response.json()
                if isinstance(checkins, list):
                    self.log_result("Check-ins Get Venue", True, f"Retrieved {len(checkins)} check-ins for venue")
                else:
                    self.log_result("Check-ins Get Venue", False, "Invalid response format", response)
            else:
                self.log_result("Check-ins Get Venue", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Check-ins Get Venue", False, f"Exception: {str(e)}")
        
        # Test 4: Checkout
        try:
            response = requests.post(f"{self.base_url}/checkins/{user_id}/checkout")
            if response.status_code == 200:
                self.log_result("Check-ins Checkout", True, "Successfully checked out user")
            else:
                self.log_result("Check-ins Checkout", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Check-ins Checkout", False, f"Exception: {str(e)}")

    def test_swipes_matches_endpoints(self):
        """Test Swipes and Matches endpoints"""
        print("=== TESTING SWIPES & MATCHES ENDPOINTS ===")
        
        if len(self.created_users) < 1:
            self.log_result("Swipes Tests", False, "Need at least 1 test user")
            return
        
        # Create a second user for swipe testing
        signup_data = {
            "email": "testuser2@test.com",
            "password": "pass123",
            "displayName": "Test User 2",
            "username": "testuser2",
            "agreedToTerms": True
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/signup", json=signup_data)
            if response.status_code == 201:
                user2_data = response.json()
                self.created_users.append(user2_data["id"])
                
                user1_id = self.created_users[0]
                user2_id = self.created_users[1]
                venue_id = self.created_venues[0] if self.created_venues else "test-venue-id"
                
                # Test 1: Create swipe
                swipe_data = {
                    "userId": user1_id,
                    "targetUserId": user2_id,
                    "venueId": venue_id,
                    "direction": "right"
                }
                
                try:
                    response = requests.post(f"{self.base_url}/swipes", json=swipe_data)
                    if response.status_code == 201:
                        swipe_result = response.json()
                        self.log_result("Swipes Create", True, f"Created swipe, match: {swipe_result.get('match', False)}")
                        
                        # Create reverse swipe to create match
                        reverse_swipe = {
                            "userId": user2_id,
                            "targetUserId": user1_id,
                            "venueId": venue_id,
                            "direction": "right"
                        }
                        
                        response2 = requests.post(f"{self.base_url}/swipes", json=reverse_swipe)
                        if response2.status_code == 201:
                            swipe_result2 = response2.json()
                            if swipe_result2.get("match"):
                                self.matches.append(swipe_result2.get("matchId"))
                                self.log_result("Swipes Create Match", True, "Successfully created mutual match")
                            else:
                                self.log_result("Swipes Create Match", False, "Expected match but none created")
                        
                    else:
                        self.log_result("Swipes Create", False, f"Status code: {response.status_code}", response)
                except Exception as e:
                    self.log_result("Swipes Create", False, f"Exception: {str(e)}")
                
                # Test 2: Get user matches
                try:
                    response = requests.get(f"{self.base_url}/matches/user/{user1_id}")
                    if response.status_code == 200:
                        matches = response.json()
                        if isinstance(matches, list):
                            self.log_result("Matches Get User", True, f"Retrieved {len(matches)} matches for user")
                        else:
                            self.log_result("Matches Get User", False, "Invalid response format", response)
                    else:
                        self.log_result("Matches Get User", False, f"Status code: {response.status_code}", response)
                except Exception as e:
                    self.log_result("Matches Get User", False, f"Exception: {str(e)}")
                    
            else:
                self.log_result("Swipes Setup User2", False, f"Failed to create second user: {response.status_code}")
        except Exception as e:
            self.log_result("Swipes Setup User2", False, f"Exception: {str(e)}")

    def test_messages_endpoints(self):
        """Test Messages endpoints"""
        print("=== TESTING MESSAGES ENDPOINTS ===")
        
        if not self.matches or len(self.created_users) < 2:
            self.log_result("Messages Tests", False, "No matches available for messaging")
            return
        
        match_id = self.matches[0]
        sender_id = self.created_users[0]
        
        # Test 1: Send message
        message_data = {
            "matchId": match_id,
            "senderId": sender_id,
            "content": "Hello from API test!"
        }
        
        try:
            response = requests.post(f"{self.base_url}/messages", json=message_data)
            if response.status_code == 201:
                message_result = response.json()
                if "id" in message_result:
                    self.log_result("Messages Send", True, f"Successfully sent message with ID: {message_result['id']}")
                else:
                    self.log_result("Messages Send", False, "No message ID returned", response)
            else:
                self.log_result("Messages Send", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Messages Send", False, f"Exception: {str(e)}")
        
        # Test 2: Get match messages
        try:
            response = requests.get(f"{self.base_url}/messages/match/{match_id}")
            if response.status_code == 200:
                messages = response.json()
                if isinstance(messages, list):
                    self.log_result("Messages Get Match", True, f"Retrieved {len(messages)} messages for match")
                else:
                    self.log_result("Messages Get Match", False, "Invalid response format", response)
            else:
                self.log_result("Messages Get Match", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Messages Get Match", False, f"Exception: {str(e)}")

    def test_events_endpoints(self):
        """Test Events endpoints"""
        print("=== TESTING EVENTS ENDPOINTS ===")
        
        # Test 1: Get all events
        try:
            response = requests.get(f"{self.base_url}/events")
            if response.status_code == 200:
                events = response.json()
                if len(events) == 5:
                    self.log_result("Events Get All", True, f"Retrieved all {len(events)} events")
                else:
                    self.log_result("Events Get All", False, f"Expected 5 events, got {len(events)}", response)
            else:
                self.log_result("Events Get All", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Events Get All", False, f"Exception: {str(e)}")
        
        if not self.created_users:
            return
            
        user_id = self.created_users[0]
        
        # Get first event for RSVP testing
        try:
            response = requests.get(f"{self.base_url}/events")
            if response.status_code == 200:
                events = response.json()
                if events:
                    event_id = events[0]["id"]
                    
                    # Test 2: RSVP to event
                    rsvp_data = {
                        "userId": user_id,
                        "eventId": event_id,
                        "status": "going"
                    }
                    
                    try:
                        response = requests.post(f"{self.base_url}/rsvps", json=rsvp_data)
                        if response.status_code == 201:
                            self.log_result("Events RSVP", True, "Successfully RSVPed to event")
                        else:
                            self.log_result("Events RSVP", False, f"Status code: {response.status_code}", response)
                    except Exception as e:
                        self.log_result("Events RSVP", False, f"Exception: {str(e)}")
                    
                    # Test 3: Get user RSVPs
                    try:
                        response = requests.get(f"{self.base_url}/rsvps/user/{user_id}")
                        if response.status_code == 200:
                            rsvps = response.json()
                            if isinstance(rsvps, list):
                                self.log_result("Events Get User RSVPs", True, f"Retrieved {len(rsvps)} RSVPs")
                            else:
                                self.log_result("Events Get User RSVPs", False, "Invalid response format", response)
                        else:
                            self.log_result("Events Get User RSVPs", False, f"Status code: {response.status_code}", response)
                    except Exception as e:
                        self.log_result("Events Get User RSVPs", False, f"Exception: {str(e)}")
        except Exception as e:
            pass

    def test_gifts_endpoints(self):
        """Test Gifts endpoints"""
        print("=== TESTING GIFTS ENDPOINTS ===")
        
        # Test 1: Get all gifts
        try:
            response = requests.get(f"{self.base_url}/gifts")
            if response.status_code == 200:
                gifts = response.json()
                if len(gifts) == 12:
                    self.log_result("Gifts Get All", True, f"Retrieved all {len(gifts)} gifts")
                else:
                    self.log_result("Gifts Get All", False, f"Expected 12 gifts, got {len(gifts)}", response)
            else:
                self.log_result("Gifts Get All", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Gifts Get All", False, f"Exception: {str(e)}")
        
        if len(self.created_users) < 2:
            return
            
        # Test 2: Send gift
        gift_data = {
            "senderId": self.created_users[0],
            "recipientId": self.created_users[1],
            "giftType": "rose",
            "message": "API test gift"
        }
        
        try:
            response = requests.post(f"{self.base_url}/gifts/send", json=gift_data)
            if response.status_code == 201:
                self.log_result("Gifts Send", True, "Successfully sent gift")
            else:
                self.log_result("Gifts Send", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Gifts Send", False, f"Exception: {str(e)}")

    def test_admin_endpoints(self):
        """Test Admin endpoints"""
        print("=== TESTING ADMIN ENDPOINTS ===")
        
        if not self.created_users:
            return
            
        user_id = self.created_users[0]
        
        # Test 1: Create AI user
        ai_user_data = {
            "displayName": "AI Test User",
            "bio": "AI generated test user"
        }
        
        try:
            response = requests.post(f"{self.base_url}/admin/ai-user", json=ai_user_data)
            if response.status_code == 201:
                ai_user = response.json()
                if "id" in ai_user:
                    self.log_result("Admin Create AI User", True, f"Created AI user with ID: {ai_user['id']}")
                else:
                    self.log_result("Admin Create AI User", False, "No AI user ID returned", response)
            else:
                self.log_result("Admin Create AI User", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Admin Create AI User", False, f"Exception: {str(e)}")
        
        # Test 2: Get AI users
        try:
            response = requests.get(f"{self.base_url}/admin/ai-users")
            if response.status_code == 200:
                ai_users = response.json()
                if isinstance(ai_users, list):
                    self.log_result("Admin Get AI Users", True, f"Retrieved {len(ai_users)} AI users")
                else:
                    self.log_result("Admin Get AI Users", False, "Invalid response format", response)
            else:
                self.log_result("Admin Get AI Users", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Admin Get AI Users", False, f"Exception: {str(e)}")
        
        # Note: Make admin, ban, block, timeout, and list users require admin privileges
        # These would need an admin user to test properly
        self.log_result("Admin Privileged Endpoints", False, "Requires admin user setup - testing skipped for security")

    def test_safety_endpoints(self):
        """Test Safety endpoints"""
        print("=== TESTING SAFETY ENDPOINTS ===")
        
        if not self.created_users:
            return
            
        user_id = self.created_users[0]
        
        # Test 1: Create emergency contact
        contact_data = {
            "userId": user_id,
            "name": "Emergency Contact Test",
            "phoneNumber": "+1234567890",
            "relationship": "Friend"
        }
        
        contact_id = None
        try:
            response = requests.post(f"{self.base_url}/emergency-contacts", json=contact_data)
            if response.status_code == 201:
                contact = response.json()
                if "id" in contact:
                    contact_id = contact["id"]
                    self.log_result("Safety Create Contact", True, f"Created emergency contact with ID: {contact_id}")
                else:
                    self.log_result("Safety Create Contact", False, "No contact ID returned", response)
            else:
                self.log_result("Safety Create Contact", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Safety Create Contact", False, f"Exception: {str(e)}")
        
        # Test 2: Get user emergency contacts
        try:
            response = requests.get(f"{self.base_url}/emergency-contacts/user/{user_id}")
            if response.status_code == 200:
                contacts = response.json()
                if isinstance(contacts, list):
                    self.log_result("Safety Get Contacts", True, f"Retrieved {len(contacts)} emergency contacts")
                else:
                    self.log_result("Safety Get Contacts", False, "Invalid response format", response)
            else:
                self.log_result("Safety Get Contacts", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Safety Get Contacts", False, f"Exception: {str(e)}")
        
        # Test 3: Update emergency contact
        if contact_id:
            update_data = {"name": "Updated Emergency Contact"}
            try:
                response = requests.put(f"{self.base_url}/emergency-contacts/{contact_id}", json=update_data)
                if response.status_code == 200:
                    self.log_result("Safety Update Contact", True, "Successfully updated emergency contact")
                else:
                    self.log_result("Safety Update Contact", False, f"Status code: {response.status_code}", response)
            except Exception as e:
                self.log_result("Safety Update Contact", False, f"Exception: {str(e)}")
        
        # Test 4: Activate emergency alert
        alert_data = {
            "userId": user_id,
            "latitude": 36.1627,
            "longitude": -86.7816,
            "message": "Test emergency alert"
        }
        
        try:
            response = requests.post(f"{self.base_url}/emergency-alert/activate", json=alert_data)
            if response.status_code == 201:
                self.log_result("Safety Activate Alert", True, "Successfully activated emergency alert")
            else:
                self.log_result("Safety Activate Alert", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Safety Activate Alert", False, f"Exception: {str(e)}")
        
        # Test 5: Update alert location
        location_data = {
            "userId": user_id,
            "latitude": 36.1650,
            "longitude": -86.7800
        }
        
        try:
            response = requests.post(f"{self.base_url}/emergency-alert/update-location", json=location_data)
            if response.status_code == 200:
                self.log_result("Safety Update Location", True, "Successfully updated alert location")
            else:
                self.log_result("Safety Update Location", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Safety Update Location", False, f"Exception: {str(e)}")
        
        # Test 6: Get active alert
        try:
            response = requests.get(f"{self.base_url}/emergency-alert/active/{user_id}")
            if response.status_code == 200:
                alert = response.json()
                self.log_result("Safety Get Active Alert", True, "Retrieved active emergency alert")
            else:
                self.log_result("Safety Get Active Alert", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Safety Get Active Alert", False, f"Exception: {str(e)}")
        
        # Test 7: Deactivate alert (requires PIN)
        deactivate_data = {
            "userId": user_id,
            "pin": "1234"  # PIN we set earlier
        }
        
        try:
            response = requests.post(f"{self.base_url}/emergency-alert/deactivate", json=deactivate_data)
            if response.status_code == 200:
                self.log_result("Safety Deactivate Alert", True, "Successfully deactivated emergency alert")
            else:
                self.log_result("Safety Deactivate Alert", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Safety Deactivate Alert", False, f"Exception: {str(e)}")
        
        # Test 8: Delete emergency contact
        if contact_id:
            try:
                response = requests.delete(f"{self.base_url}/emergency-contacts/{contact_id}")
                if response.status_code == 200:
                    self.log_result("Safety Delete Contact", True, "Successfully deleted emergency contact")
                else:
                    self.log_result("Safety Delete Contact", False, f"Status code: {response.status_code}", response)
            except Exception as e:
                self.log_result("Safety Delete Contact", False, f"Exception: {str(e)}")

    def test_support_endpoints(self):
        """Test Support endpoints"""
        print("=== TESTING SUPPORT ENDPOINTS ===")
        
        if not self.created_users:
            return
            
        user_id = self.created_users[0]
        
        # Test 1: Create support ticket
        ticket_data = {
            "userId": user_id,
            "subject": "API Test Ticket",
            "description": "This is a test ticket created during API testing",
            "priority": "medium"
        }
        
        try:
            response = requests.post(f"{self.base_url}/support/ticket", json=ticket_data)
            if response.status_code == 201:
                ticket = response.json()
                if "id" in ticket:
                    self.log_result("Support Create Ticket", True, f"Created support ticket with ID: {ticket['id']}")
                else:
                    self.log_result("Support Create Ticket", False, "No ticket ID returned", response)
            else:
                self.log_result("Support Create Ticket", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Support Create Ticket", False, f"Exception: {str(e)}")
        
        # Test 2: Get app settings
        try:
            response = requests.get(f"{self.base_url}/settings")
            if response.status_code == 200:
                settings = response.json()
                self.log_result("Support Get Settings", True, "Retrieved app settings")
            else:
                self.log_result("Support Get Settings", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Support Get Settings", False, f"Exception: {str(e)}")
        
        # Note: Get tickets and update settings require admin privileges

    def test_flirts_endpoints(self):
        """Test Flirts endpoints"""
        print("=== TESTING FLIRTS ENDPOINTS ===")
        
        if len(self.created_users) < 2 or not self.created_venues:
            self.log_result("Flirts Tests", False, "Need 2 users and venues for flirt testing")
            return
        
        user1_id = self.created_users[0]
        user2_id = self.created_users[1]
        venue_id = self.created_venues[0]
        
        # Both users need to be checked in to send flirts
        # Check-in user 1
        checkin_data1 = {
            "userId": user1_id,
            "venueId": venue_id,
            "latitude": 36.1627,
            "longitude": -86.7816
        }
        
        checkin_data2 = {
            "userId": user2_id,
            "venueId": venue_id,
            "latitude": 36.1627,
            "longitude": -86.7816
        }
        
        # Check both users in
        try:
            requests.post(f"{self.base_url}/checkins", json=checkin_data1)
            requests.post(f"{self.base_url}/checkins", json=checkin_data2)
            
            # Test 1: Send flirt
            flirt_data = {
                "senderId": user1_id,
                "recipientId": user2_id,
                "venueId": venue_id,
                "message": "API test flirt message"
            }
            
            response = requests.post(f"{self.base_url}/flirts", json=flirt_data)
            if response.status_code == 201:
                flirt = response.json()
                if "id" in flirt:
                    self.log_result("Flirts Send", True, f"Successfully sent flirt with ID: {flirt['id']}")
                else:
                    self.log_result("Flirts Send", False, "No flirt ID returned", response)
            else:
                self.log_result("Flirts Send", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Flirts Send", False, f"Exception: {str(e)}")
        
        # Test 2: Get received flirts
        try:
            response = requests.get(f"{self.base_url}/flirts/user/{user2_id}")
            if response.status_code == 200:
                flirts = response.json()
                if isinstance(flirts, list):
                    self.log_result("Flirts Get Received", True, f"Retrieved {len(flirts)} received flirts")
                else:
                    self.log_result("Flirts Get Received", False, "Invalid response format", response)
            else:
                self.log_result("Flirts Get Received", False, f"Status code: {response.status_code}", response)
        except Exception as e:
            self.log_result("Flirts Get Received", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Smashville Backend API Testing")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Run tests in logical order
        self.test_auth_endpoints()
        self.test_users_endpoints() 
        self.test_venues_endpoints()
        self.test_checkins_endpoints()
        self.test_swipes_matches_endpoints()
        self.test_messages_endpoints()
        self.test_events_endpoints()
        self.test_gifts_endpoints()
        self.test_admin_endpoints()
        self.test_safety_endpoints()
        self.test_support_endpoints()
        self.test_flirts_endpoints()
        
        # Print final results
        print("=" * 60)
        print("🏁 TESTING COMPLETE")
        print(f"✅ PASSED: {self.test_results['passed']}")
        print(f"❌ FAILED: {self.test_results['failed']}")
        print(f"📊 SUCCESS RATE: {(self.test_results['passed']/(self.test_results['passed']+self.test_results['failed']))*100:.1f}%")
        
        if self.test_results["errors"]:
            print("\n🚨 FAILED TESTS SUMMARY:")
            for error in self.test_results["errors"]:
                print(f"❌ {error['test']}: {error['message']}")
        
        return self.test_results

if __name__ == "__main__":
    tester = SmashvilleAPITester()
    results = tester.run_all_tests()
    
    # Exit with error code if tests failed
    if results["failed"] > 0:
        sys.exit(1)
    else:
        sys.exit(0)