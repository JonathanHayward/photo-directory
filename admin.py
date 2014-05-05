#!/usr/bin/python
# coding=UTF-8

import django.contrib.admin
import directory.models

django.contrib.admin.autodiscover()
django.contrib.admin.site.register(directory.models.Entity)
#django.contrib.admin.site.register(directory.models.Location)
