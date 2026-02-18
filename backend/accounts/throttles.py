from rest_framework.throttling import AnonRateThrottle

"""
CONTROLLING FORGOT PASSWORD TRY
"""
class ForgotPasswordThrottle(AnonRateThrottle):
    scope = "forgot_password"
