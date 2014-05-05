#!/usr/bin/python
# coding=UTF-8

from django.conf.urls.defaults import *

import admin
import directory.models
import directory.views
import django.contrib.auth.views
import settings

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns(u'',
    (ur'^$', directory.views.homepage),
    (ur'^accounts/login/$', u'django.contrib.auth.views.login'),
    (ur'^admin/', include(admin.site.urls)),
    (ur'^ajax/check_login', directory.views.ajax_check_login),
    (ur'^ajax/create_user', directory.views.create_user),
    (ur'^ajax/delete', directory.views.ajax_delete),
    (ur'^ajax/download/(Email|Entity|Phone|Status|Tag|URL)', directory.views.ajax_download_model),
    (ur'^ajax/login', directory.views.ajax_login_request),
    (ur'^ajax/logout', directory.views.ajax_logout_request),
    (ur'^ajax/new/Entity', directory.views.new_Entity),
    (ur'^ajax/profile/(\d+)', directory.views.ajax_profile),
    (ur'^ajax/saveimage/(\d+)', directory.views.saveimage),
    (ur'^ajax/save', directory.views.save),
    (ur'^ajax/search', directory.views.ajax_search),
    (ur'^ajax/undo', directory.views.undo),
    (ur'^changelog', directory.views.changelog),
    (ur'^(create/Entity)', directory.views.redirect),
    (ur'^(create/Location)', directory.views.redirect),
    (ur'^manage/Entity/?(\d*)', directory.views.modelform_Entity),
    (ur'^manage/Location/?(\d*)', directory.views.modelform_Location),
    (ur'^password_reset/$', 'django.contrib.auth.views.password_reset'),
    (ur'^password_reset/done/$', 'django.contrib.auth.views.password_reset_done'),
    (ur'^profile/images/(\d+)', directory.views.image),
    (ur'^profile/(new)$', directory.views.profile_new),
    (ur'^profile/(\d+)$', directory.views.profile_existing),
    (ur'^reset/(?P<uidb36>[0-9A-Za-z]+)-(?P<token>.+)/$', 'django.contrib.auth.views.password_reset_confirm'),
    (ur'^reset/done/$', 'django.contrib.auth.views.password_reset_complete'),
    (ur'^static/js/directory_search.js', directory.views.directory_search),
    # Example:
    # (r'^directory/', include('directory.foo.urls')),

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs' 
    # to INSTALLED_APPS to enable admin documentation:
    # (r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # (r'^admin/', include(admin.site.urls)),
)

if settings.DEBUG:
    urlpatterns += patterns('django.views.static',
      (r'^%s(?P<path>.*)$' % (settings.MEDIA_URL[1:],),  'serve', {
        'document_root': settings.MEDIA_ROOT,
        'show_indexes': True }),)
