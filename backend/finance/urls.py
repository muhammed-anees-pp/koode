from django.urls import path

from .views import (
    CancelRazorpayOrderView,
    CreateWalletTopUpOrderView,
    VerifyAppointmentPaymentView,
    VerifyWalletTopUpView,
    WalletView,
)


urlpatterns = [
    path("wallet/", WalletView.as_view(), name="finance-wallet"),
    path("wallet/top-up/order/", CreateWalletTopUpOrderView.as_view(), name="finance-wallet-top-up-order"),
    path("wallet/top-up/verify/", VerifyWalletTopUpView.as_view(), name="finance-wallet-top-up-verify"),
    path("payments/appointment/verify/", VerifyAppointmentPaymentView.as_view(), name="finance-appointment-payment-verify"),
    path("payments/razorpay/cancel/", CancelRazorpayOrderView.as_view(), name="finance-razorpay-cancel"),
]
