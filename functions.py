#!/usr/bin/python
# coding=UTF-8

from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.http import HttpResponse

import datetime
import directory
import json
import os
import re
import time

def ajax_login_required(view_function):
    def wrap(request, *arguments, **keywords):
        if request.user.is_authenticated():
            return view_function(request, *arguments, **keywords)
        output = json.dumps({ u'not_authenticated': True })
        return HttpResponse(output, mimetype = u'application/json')
    wrap.__doc__ = view_function.__doc__
    wrap.__dict__ = view_function.__dict__
    return wrap

def ajax_permission_required(permission):
    def outer_wrap(view_function):
        def wrap(request, *arguments, **keywords):
            if request.user.has_perm(permission):
                return view_function(request, *arguments, **keywords)
            output = json.dumps({ u'not_permitted': True })
            return HttpResponse(output, mimetype = u'application/json')
        return wrap
    return outer_wrap

def count_tokens(raw, query):
    result = 0
    try:
        tokens = re.split(ur'(?u)[^-\w]', raw)
    except TypeError:
        tokens = raw
    while u'' in tokens:
        tokens.remove(u'')
    try:
        matches = re.split(ur'(?u)[^-\w]', query)
    except TypeError:
        tokens = query
    while u'' in matches:
        matches.remove(u'')
    for token in tokens:
        for match in matches:
            if token.lower() == match.lower():
                result += 1
    return result

def format_timestamp(timestamp):
    localtime = timestamp.timetuple()
    result = unicode(int(time.strftime(u'%I', localtime)))
    result += time.strftime(u':%M %p, %A %B ', localtime)
    result += unicode(int(time.strftime(u'%d', localtime)))
    result += time.strftime(u', %Y')
    return result

def log_message(message):
    log_file = os.path.join(os.path.dirname(__file__),
      directory.settings.LOGFILE)
    try:
        open(log_file, u'a').write(unicode(time.asctime()) + u': ' +
          unicode(message, u'utf-8').encode(u'utf-8') + u'\n')
    except:
        open(log_file, u'a').write(time.asctime() + u': ' +
          u'An error occurred recording this message.' + u'\n')

def register_edit(change_type, instance, session, username, ip, change_set =
  None, content_type = None, field_name = None, foreign_key_added = None,
  foreign_key_deleted = None, text_before = None, text_after = None):
    edit = directory.models.EditTrail()
    edit.object_id = instance.id
    if change_set:
        edit.change_set = change_set
    else:
        increment = directory.models.Increment()
        increment.save()
        edit.change_set = increment.id
    edit.change_type = change_type
    edit.field_name = field_name
    edit.in_effect = True
    edit.instance = instance
    edit.ip = ip
    edit.timestamp = datetime.datetime.now()
    edit.username = username
    if change_type == directory.models.TEXT_CHANGED:
        edit.text_before = text_before
        edit.text_after = text_after
    elif change_type in (directory.models.FOREIGN_KEY_RELATIONSHIP_CHANGED,
      directory.models.MANY_TO_MANY_RELATIONSHIP_ADDED,
      directory.models.MANY_TO_MANY_RELATIONSHIP_DELETED,
      directory.models.MANY_TO_ONE_RELATIONSHIP_ADDED,
      directory.models.MANY_TO_ONE_RELATIONSHIP_DELETED):
        if foreign_key_added:
            edit.foreign_key_added = foreign_key_added
        if foreign_key_deleted:
            edit.foreign_key_deleted = foreign_key_deleted
    edit.save()
    return edit.change_set

def score(entity, keywords):
    result = 0
    if entity.name:
        result += count_tokens(entity.name, keywords) * \
          directory.settings.NAME_WEIGHT
    if entity.description:
        result += count_tokens(entity.description, keywords) * \
          directory.settings.DESCRIPTION_WEIGHT
    for tag in directory.models.Tag.objects.filter(entity = entity.id):
        result += count_tokens(tag.text, keywords) * \
          directory.settings.TAG_WEIGHT
    if entity.title:
        result += count_tokens(entity.title, keywords) * \
          directory.settings.TITLE_WEIGHT
    if entity.department:
        result += count_tokens(entity.department.name, keywords) * \
          directory.settings.DEPARTMENT_WEIGHT
    if entity.location:
        result += count_tokens(entity.location.name, keywords) * \
          directory.settings.LOCATION_WEIGHT
    for status in directory.models.Status.objects.filter(entity = entity.id):
        result += count_tokens(status.text, keywords) * \
          directory.settings.STATUS_WEIGHT
    return result
