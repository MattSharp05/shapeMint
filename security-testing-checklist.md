# 🔐 ShapeMint Authentication Security Testing Checklist

## 🎯 Authentication Testing with Burp Suite

### **1. Login Bypass Testing**

#### **1.1 SQL Injection in Login**
- [ ] **Test with SQL injection payloads:**
  ```
  Email: admin' OR '1'='1
  Email: admin' --
  Email: admin' OR 1=1#
  Email: admin' UNION SELECT 1,2,3--
  ```
- [ ] **Check for error messages revealing database structure**
- [ ] **Test with blind SQL injection**

#### **1.2 Authentication Bypass**
- [ ] **Try accessing protected pages without login**
- [ ] **Test with empty credentials**
- [ ] **Test with null values**
- [ ] **Test with special characters**

#### **1.3 Weak Authentication**
- [ ] **Test with common passwords:**
  ```
  admin/admin
  admin/password
  admin/123456
  test/test
  ```
- [ ] **Test with default credentials**
- [ ] **Check for password complexity requirements**

### **2. Session Management Testing**

#### **2.1 Session Fixation**
- [ ] **Capture session token before login**
- [ ] **Login with different account**
- [ ] **Check if session token changed**

#### **2.2 Session Timeout**
- [ ] **Login and wait for session expiry**
- [ ] **Test session timeout configuration**
- [ ] **Check if tokens are properly invalidated**

#### **2.3 Session Hijacking**
- [ ] **Capture session tokens in Burp**
- [ ] **Reuse tokens in different requests**
- [ ] **Test token transfer between users**

### **3. Registration Testing**

#### **3.1 Account Enumeration**
- [ ] **Try registering with existing email**
- [ ] **Check error messages for user existence**
- [ ] **Test with variations of known emails**

#### **3.2 Weak Registration**
- [ ] **Test with weak passwords**
- [ ] **Test with invalid email formats**
- [ ] **Test with empty required fields**

#### **3.3 Privilege Escalation**
- [ ] **Register as regular user**
- [ ] **Try to access admin functions**
- [ ] **Check role-based access control**

### **4. Password Security Testing**

#### **4.1 Password Policy**
- [ ] **Test minimum password length (currently 6)**
- [ ] **Test password complexity requirements**
- [ ] **Test password history**

#### **4.2 Password Reset**
- [ ] **Test "Forgot Password" functionality**
- [ ] **Check if reset tokens are predictable**
- [ ] **Test reset token expiration**

### **5. Rate Limiting Testing**

#### **5.1 Login Rate Limiting**
- [ ] **Attempt multiple failed logins**
- [ ] **Check if account gets locked**
- [ ] **Test rate limit bypass techniques**

#### **5.2 Registration Rate Limiting**
- [ ] **Attempt multiple registrations**
- [ ] **Check for rate limiting on registration**

### **6. Input Validation Testing**

#### **6.1 XSS in Authentication Forms**
- [ ] **Test with XSS payloads:**
  ```
  <script>alert('XSS')</script>
  "><script>alert('XSS')</script>
  '><script>alert('XSS')</script>
  ```
- [ ] **Test stored XSS in user profiles**

#### **6.2 CSRF Testing**
- [ ] **Test for CSRF tokens**
- [ ] **Check if tokens are properly validated**
- [ ] **Test token reuse**

### **7. API Security Testing**

#### **7.1 Supabase Auth Endpoints**
- [ ] **Test direct API calls to Supabase**
- [ ] **Check for exposed API keys**
- [ ] **Test authentication bypass in API**

#### **7.2 Edge Function Security**
- [ ] **Test generate-3d-model function**
- [ ] **Check user_id validation**
- [ ] **Test unauthorized access to functions**

### **8. Burp Suite Specific Tests**

#### **8.1 Intercept and Modify**
- [ ] **Intercept login requests**
- [ ] **Modify authentication parameters**
- [ ] **Test with different user IDs**

#### **8.2 Repeater Testing**
- [ ] **Send modified requests**
- [ ] **Test different authentication methods**
- [ ] **Check response variations**

#### **8.3 Intruder Testing**
- [ ] **Brute force login attempts**
- [ ] **Test common passwords**
- [ ] **Test user enumeration**

## 🚨 Critical Security Issues to Look For

### **High Priority:**
- [ ] **SQL Injection in login/registration**
- [ ] **Authentication bypass**
- [ ] **Session fixation**
- [ ] **Weak password policy**
- [ ] **Account enumeration**

### **Medium Priority:**
- [ ] **XSS in authentication forms**
- [ ] **CSRF vulnerabilities**
- [ ] **Rate limiting bypass**
- [ ] **Information disclosure**

### **Low Priority:**
- [ ] **Weak session timeout**
- [ ] **Missing security headers**
- [ ] **Predictable tokens**

## 📝 Testing Notes Template

```
Test Case: [Description]
URL: [Target URL]
Method: [GET/POST]
Payload: [Test payload]
Expected: [Expected behavior]
Actual: [Actual result]
Status: [Pass/Fail]
Notes: [Additional notes]
```

## 🔧 Burp Suite Configuration

### **Proxy Settings:**
- **Proxy port:** 8080
- **Intercept:** Enable for requests/responses
- **Match and Replace:** Set up for testing

### **Scanner Settings:**
- **Active scanning:** Enable for authentication endpoints
- **Passive scanning:** Enable for all traffic

### **Repeater:**
- **Save requests** for authentication testing
- **Compare responses** for different users

## 📊 Reporting Template

```
## Authentication Security Assessment Report

### Executive Summary
[Brief overview of findings]

### Critical Findings
[List of critical vulnerabilities]

### Recommendations
[Specific remediation steps]

### Test Coverage
[What was tested vs. what should be tested]
``` 