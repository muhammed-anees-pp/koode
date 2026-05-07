from django.contrib import admin

from .models import CommissionRate, RazorpayOrder, Wallet, WalletTransaction


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("user", "balance", "updated_at")
    search_fields = ("user__email", "user__full_name")


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ("wallet", "transaction_type", "source", "amount", "balance_after", "created_at")
    list_filter = ("transaction_type", "source")
    search_fields = ("wallet__user__email", "reference")


@admin.register(RazorpayOrder)
class RazorpayOrderAdmin(admin.ModelAdmin):
    list_display = ("razorpay_order_id", "user", "purpose", "amount", "status", "created_at")
    list_filter = ("purpose", "status")
    search_fields = ("razorpay_order_id", "razorpay_payment_id", "user__email")


@admin.register(CommissionRate)
class CommissionRateAdmin(admin.ModelAdmin):
    list_display = ("percentage", "effective_from", "changed_by", "created_at")
    search_fields = ("changed_by__email", "changed_by__full_name")
