from django.contrib import admin
from . models import Booking, Availability, AvailableSlot


# Register your models here.
admin.site.register(Booking)
admin.site.register(Availability)
admin.site.register(AvailableSlot)