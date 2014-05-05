#!/usr/bin/python
# coding=UTF-8

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required, permission_required
from django.contrib.auth.models import User
from django.contrib.auth.views import password_reset
from django.core import serializers
from django.db.models import get_model
from django.http import HttpResponse, HttpResponseRedirect, HttpResponsePermanentRedirect
from django.shortcuts import render_to_response
from django.template import Context, RequestContext, Template
from django.template.defaultfilters import escape
from django.template.loader import get_template
from directory.functions import ajax_login_required, register_edit
from directory.models import FOREIGN_KEY_RELATIONSHIP_CHANGED, \
  IMAGE_CHANGED, INSTANCE_CREATED, INSTANCE_DELETED, \
  MANY_TO_MANY_RELATIONSHIP_ADDED, MANY_TO_MANY_RELATIONSHIP_DELETED, \
  MANY_TO_ONE_RELATIONSHIP_ADDED, MANY_TO_ONE_RELATIONSHIP_DELETED, \
  TEXT_CHANGED

import directory
import json
import os
import re
import urllib

RESULTS_PER_PAGE = 10

@ajax_login_required
def ajax_check_login(request):
    output = json.dumps({ u'not_authenticated': False })
    return HttpResponse(output, mimetype = u'application/json')

@ajax_login_required
def ajax_delete(request):
    session = request.session.session_key
    username = request.user.username
    change_set = None
    search = re.search(ur'(.*)_(\d+)', request.POST[u'id'])
    if search:
        model = getattr(directory.models, search.group(1)).objects.get(id =
          int(search.group(2)))
        change_set = register_edit(INSTANCE_DELETED, model, session,
          username, request.META[u'REMOTE_ADDR'])
        model.is_invisible = True
        model.save()
    directory.functions.log_message(u'Deleted: ' + request.POST[u'id'] +
      u' by ' + request.user.username + u'.')
    if change_set == None:
        return HttpResponse(u'')
    else:
        response = u'<!--# ' + str(change_set) + u' #-->'
        return HttpResponse(response)

def ajax_download_model(request, model):
    if directory.settings.SHOULD_DOWNLOAD_DIRECTORY:
        json_serializer = serializers.get_serializer(u'json')()
        response = HttpResponse(mimetype = u'application/json')
        if model == u'Entity':
            json_serializer.serialize(getattr(directory.models,
              model).objects.filter(is_invisible = False).order_by(u'name'),
              ensure_ascii = False, stream = response)
        else:
            json_serializer.serialize(getattr(directory.models,
              model).objects.filter(is_invisible = False), ensure_ascii = False,
              stream = response)
        return response
    else:
        return HttpResponse(u'This feature has been turned off.')

def ajax_login_request(request):
    try:
        request.POST[u'login']
        dictionary = request.POST
    except:
        dictionary = request.GET
    user = authenticate(username = dictionary[u'login'], password = dictionary[u'password'])
    if user and user.is_active:
        login(request, user)
        result = True
    else:
        result = False
    response = HttpResponse(json.dumps(result), mimetype = u'application/json')
    return response

def ajax_logout_request(request):
    logout(request)
    return HttpResponse('')

def ajax_profile(request, id):
    entity = directory.models.Entity.objects.filter(id = int(id))[0]
    if entity.is_invisible:
        return HttpResponse(u'<h2>People, etc.</h2>')
    if entity.gps:
        gps = entity.gps
    elif entity.location and entity.location.gps:
        gps = entity.location.gps
    else:
        gps = u''
    if gps:
        gps_url = \
          u'http://maps.google.com/maps?f=q&source=s_q&hl=en&q=' \
          + gps.replace(u' ', u'+') + "&iwloc=A&hl=en"
    else:
        gps_url = u''
    return render_to_response(u'profile_internal.html',
        {
        u'entities': directory.models.Entity.objects.filter(is_invisible =
          False).order_by(u'name'),
        u'entity': entity,
        u'first_stati': directory.models.Status.objects.filter(entity =
          id).order_by(u'-datetime')[:directory.settings.INITIAL_STATI],
        u'gps': gps,
        u'gps_url': gps_url,
        u'id': int(id),
        u'emails': directory.models.Email.objects.filter(entity = entity,
          is_invisible = False),
        u'phones': directory.models.Phone.objects.filter(entity = entity,
          is_invisible = False),
        u'second_stati': directory.models.Status.objects.filter(entity =
          id).order_by(u'-datetime')[directory.settings.INITIAL_STATI:],
        u'tags': directory.models.Tag.objects.filter(entity = entity,
          is_invisible = False).order_by(u'text'),
        u'time_zones': directory.models.TIME_ZONE_CHOICES,
        u'urls': directory.models.URL.objects.filter(entity = entity,
          is_invisible = False),
        })

def ajax_search(request):
    try:
        query = request.POST[u'query']
    except KeyError:
        try:
            query = request.GET[u'query']
        except KeyError:
            return HttpResponse(u'')
    if query.lower().strip() == "all":
        tokens = []
    else:
        tokens = re.split(ur'(?u)[^-\w]', query)
    while u'' in tokens:
        tokens.remove(u'')
    candidates = []
    for candidate in directory.models.Entity.objects.filter(is_invisible =
      False):
        candidates.append([candidate, 0])
    for token in tokens:
        new_candidates = []
        for candidate in candidates:
            if directory.functions.score(candidate[0], token) > 0:
                candidate[1] += directory.functions.score(candidate[0], token)
                new_candidates.append(candidate)
        candidates = new_candidates
    candidates.sort(lambda a, b: -cmp(a[1], b[1]))
    export = []
    for candidate in candidates:
        if candidate[0].image_mimetype:
            image = True
        else:
            image = False
        if candidate[0].department:
            name = candidate[0].department.name
        else:
            name = u''
        export.append(
            {
            u'department': name,
            u'description': candidate[0].description,
            u'id': candidate[0].id, 
            u'image': image,
            u'name': candidate[0].name,
            u'title': candidate[0].title,
            })
    first_portion = export[:directory.settings.INITIAL_RESULTS]
    second_portion = export[directory.settings.INITIAL_RESULTS:]
    return render_to_response(u'search_internal.html',
      {
      u'first_portion': first_portion,
      u'second_portion': second_portion,
      u'query': urllib.quote(query),
      })

@login_required
@permission_required("Entity.view_changelog")
def changelog(request):
    candidates = \
      directory.models.EditTrail.objects.filter(in_effect = True).order_by(
      u'change_set')
    messages = []
    for candidate in candidates:
        message = None
        change = candidate
        id = change.change_set
        model_name = unicode(type(change.instance))[7:-2]
        description = ''
        def get_description(instance):
            description = u''
            if not instance:
                return u''
            instance_model_name = unicode(type(instance))[7:-2].split(u'.')[-1]
            if hasattr(instance, u'name') and instance.name:
                description += u' ' + instance.name + u', '
            description += u'a'
            if instance_model_name and instance_model_name[0].lower() in \
              u'aeiou':
                description += u'n'
            description += u' ' + instance_model_name
            return description
        model_name = get_description(change.instance)
        timestamp = change.format_timestamp()
        name = u'<abbr title="' + change.ip + '">' + \
          change.username.title() + '</abbr>'
        if change.change_type == INSTANCE_DELETED:
            message = name + u' ' + u'deleted ' + model_name + u'.'
        elif change.change_type == TEXT_CHANGED:
            message = name + u' changed the ' + \
              change.field_name + u' on ' + description + \
              u' from "'
            if change.text_before:
                message += change.text_before
            message += u'" to "'
            if change.text_after:
                message += change.text_after
            message += u'".'
        if message:
            messages.append(
                {
                u'change_set': id,
                u'message': message,
                u'timestamp': timestamp,
                })
    return render_to_response(u'changelog.html',
      {
      u'messages': messages,
      u'settings': directory.settings,
      })
      
def create_user(request):
    if settings.SHOULD_ALLOW_USERS_TO_CREATE_ACCOUNTS:
        username = request.REQUEST[u'new_username']
        email = request.REQUEST[u'new_email']
        password = request.REQUEST[u'new_password']
        if username and email and password:
            user = User.objects.create_user(username, email, password)
            user.save()
    return HttpResponse(u'')

def directory_search(request):
    return render_to_response(u'directory_search.js',
        {
        u'settings': directory.settings,
        u'time_zones': directory.models.TIME_ZONE_CHOICES,
        })

def homepage(request):
    id = u'null'
    try:
        query = request.REQUEST[u'query']
    except KeyError:
        query = u''
    try:
        id = request.REQUEST[u'id']
        if id:
            template = get_template(u'profile_internal.html')
            entity = directory.models.Entity.objects.filter(id = int(id))[0]
            if entity.gps:
                gps = entity.gps
            elif entity.location and entity.location.gps:
                gps = entity.location.gps
            else:
                gps = u''
            if gps:
                gps_url = \
                  u'http://maps.google.com/maps?f=q&source=s_q&hl=en&q=' \
                  + gps.replace(u' ', u'+') + "&iwloc=A&hl=en"
            else:
                gps_url = u''
            profile = template.render(Context(
                {
                u'entities':
                  directory.models.Entity.objects.filter(is_invisible = False),
                u'entity': entity,
                u'first_stati': directory.models.Status.objects.filter(entity =
                  id).order_by(u'-datetime')[:directory.settings.INITIAL_STATI],
                u'gps': gps,
                u'gps_url': gps_url,
                u'id': int(id),
                u'emails': directory.models.Email.objects.filter(entity =
                  entity, is_invisible = False),
                u'phones': directory.models.Phone.objects.filter(entity =
                  entity, is_invisible = False),
                u'query': urllib.quote(query),
                u'second_stati': directory.models.Status.objects.filter(entity =
                  id).order_by(u'-datetime')[directory.settings.INITIAL_STATI:],
                u'time_zones': directory.models.TIME_ZONE_CHOICES,
                u'tags': directory.models.Tag.objects.filter(entity
                  = entity, is_invisible = False).order_by(u'text'),
                u'urls': directory.models.URL.objects.filter(entity
                  = entity, is_invisible = False),
                }))
    except KeyError:
        profile = u''
    try:
        if query:
            template = get_template(u'search_internal.html')
            if query.lower().strip() == "all":
                tokens = []
            else:
                tokens = re.split(ur'(?u)[^-\w]', query)
            while u'' in tokens:
                tokens.remove(u'')
            candidates = []
            for candidate in \
              directory.models.Entity.objects.filter(is_invisible = False):
                candidates.append([candidate, 0])
            for token in tokens:
                new_candidates = []
                for candidate in candidates:
                    if directory.functions.score(candidate[0], token) > 0:
                        candidate[1] += directory.functions.score(candidate[0], token)
                        new_candidates.append(candidate)
                candidates = new_candidates
                candidates.sort(lambda a, b: -cmp(a[1], b[1]))
            export = []
            for candidate in candidates:
                if candidate[0].image_mimetype:
                    image = True
                else:
                    image = False
                if candidate[0].department:
                    name = candidate[0].department.name
                else:
                    name = u''
                export.append(
                    {
                    u'department': name,
                    u'description': candidate[0].description,
                    u'id': candidate[0].id, 
                    u'image': image,
                    u'name': candidate[0].name,
                    u'title': candidate[0].title,
                    })
            first_portion = export[:directory.settings.INITIAL_RESULTS]
            second_portion = export[directory.settings.INITIAL_RESULTS:]
            template = get_template(u'search_internal.html')
            search_results = template.render(Context(
                {
                u'first_portion': first_portion,
                u'query': query,
                u'second_portion': second_portion,
                }))
        else:
            search_results = u''
    except KeyError:
        search_results = u''
    return render_to_response(u'search.html', Context(
        {
        u'id': id,
        u'profile': profile,
        u'query': urllib.quote(query),
        u'search_results': search_results,
        u'settings': directory.settings,
        u'time_zones': directory.models.TIME_ZONE_CHOICES,
        }))

def image(request, id):
    return HttpResponse(open(os.path.join(directory.settings.DIRNAME,
      "static", "images", "profile", id), "rb").read(),
      mimetype = directory.models.Entity.objects.filter(id =
      int(id))[0].image_mimetype)

def modelform_Entity(request, id):
    if request.method == u'POST':
        form = directory.models.EntityForm(request.POST)
        if form.is_valid():
            form.save()
    else:
        try:
            form = directory.models.EntityForm(instance =
              directory.models.Entity.objects.get(id = int(id)))
        except:
            form = directory.models.EntityForm()
    variables = RequestContext(request,
        {
        u'form': form,
        u'title': u'Entity',
        })
    return render_to_response(u'modelform.html', variables)
    
def modelform_Location(request, id):
    if request.method == u'POST':
        form = directory.models.LocationForm(request.POST)
        if form.is_valid():
            form.save()
    else:
        try:
            form = directory.models.LocationForm(instance =
              directory.models.Location.objects.get(id = int(id)))
        except:
            form = directory.models.LocationForm()
    variables = RequestContext(request,
        {
        u'form': form,
        u'title': u'Location',
        })
    return render_to_response(u'modelform.html', variables)

@ajax_login_required
def new_Entity(request):
    entity = directory.models.Entity()
    entity.save()
    json_serializer = serializers.get_serializer(u'json')()
    response = HttpResponse(mimetype = u'application/json')
    register_edit(INSTANCE_CREATED, entity, request.session.session_key,
      request.user.username, request.META[u'REMOTE_ADDR'])
    json_serializer.serialize([entity], ensure_ascii = False, stream = response)
    return response

#@login_required
def profile(request, id):
    if id == "new":
        entity = directory.models.Entity()
        entity.save()
        id = entity.id
    else:
        entity = directory.models.Entity.objects.get(id = int(id))
    emails = directory.models.Email.objects.filter(entity__exact =
      id).filter(is_invisible = False)
    all_entities = directory.models.Entity.objects.filter(is_invisible =
      False)
    all_locations = directory.models.Location.objects.filter(is_invisible
      = False)
    return HttpResponse(get_template(u'profile.html').render(Context(
      {
      u'entity': entity,
      u'emails': emails,
      u'departments': all_entities,
      u'reports_to_candidates': all_entities,
      u'locations': all_locations,
      })))

def profile_existing(request, id):
    return profile(request, id)

@login_required
def profile_new(request, id):
    return profile(request, id)

def redirect(request, original_url):
    if original_url == u'create/Entity':
        return HttpResponsePermanentRedirect(u'/manage/Entity/')
    elif original_url == u'create/Location':
        return HttpResponsePermanentRedirect(u'/manage/Location/')
    else:
        return HttpResponseRedirect(u'/')

@ajax_login_required
def save(request):
    print "Save called."
    session = request.session.session_key
    username = request.user.username
    try:
        html_id = request.POST[u'id']
        dictionary = request.POST
    except:
        html_id = request.GET[u'id']
        dictionary = request.GET
    value = dictionary[u'value']
    print "id: " + str(html_id)
    print "value: " + str(value)
    if not re.match(ur'^\w+$', html_id):
        raise Exception("Invalid HTML id.")
    match = re.match(ur'Status_new_(\d+)', html_id)
    if match:
        status = directory.models.Status(entity =
          directory.models.Entity.objects.get(id = int(match.group(1))),
          text = value, username = request.user.username)
        status.save()
        directory.functions.log_message(u'Status for Entity ' +
          str(match.group(1)) + u' added by: ' + request.user.username +
          u', value: ' + value + u'\n')
        change_set = register_edit(INSTANCE_CREATED, status, session, username, 
          request.META[u'REMOTE_ADDR'])
        register_edit(TEXT_CHANGED, status, session, username,
          request.META[u'REMOTE_ADDR'], field_name = u'text', change_set =
          change_set, text_after = value)
        return HttpResponse(u'<!--# ' + unicode(change_set) + u' #-->')
    match = re.match(ur'Email_new_(\d+)', html_id)
    if match:
        model = int(match.group(1))
        email = directory.models.Email(email = value, entity =
          directory.models.Entity.objects.get(id = model))
        email.save()
        directory.functions.log_message(u'Email for Entity ' +
          str(model) + u' added by: ' + request.user.username + u', value: ' +
          value + u'\n')
        change_set = register_edit(INSTANCE_CREATED, email, session, username,
          request.META[u'REMOTE_ADDR'])
        register_edit(TEXT_CHANGED, email, session, username,
          request.META[u'REMOTE_ADDR'], field_name = u'email', text_after =
          value)
        return HttpResponse(u'<!--# ' + unicode(change_set) + u' #-->')
    match = re.match(ur'Entity_tag_new_(\d+)', html_id)
    if match:
        model = int(match.group(1))
        entity = directory.models.Entity.objects.get(id = model)
        names = value.lower().split(" ")
        response_text = ""
        change_set = None
        for name in names:
            if name:
                if not directory.models.Tag.objects.filter(text = name, entity
                  = entity, is_invisible = False):
                    tag = directory.models.Tag(text = name, entity = entity)
                    tag.save()
                    response_text += "<span class='tag'>" + name + \
                      "</span> &nbsp; "
                    if change_set != None:
                        register_edit(MANY_TO_ONE_RELATIONSHIP_ADDED, tag,
                          session, username, request.META[u'REMOTE_ADDR'],
                          change_set = change_set, field_name = u'entity',
                          foreign_key_added = entity)
                    else:
                        change_set = \
                          register_edit(MANY_TO_ONE_RELATIONSHIP_ADDED,
                          tag, session, username, request.META[u'REMOTE_ADDR'],
                          field_name = u'entity', foreign_key_added = entity)
        entity.save()
        directory.functions.log_message(u'Tags for Entity ' +
          str(match.group(1)) + u' added by: ' + request.user.username +
          u', value: ' + value + u'\n')
        return HttpResponse(u'<!--# ' + unicode(change_set) + u' #-->')
    match = re.match(ur'Tag_new_(\d+)', html_id)
    if match:
        model = int(match.group(1))
        entity = directory.models.Entity.objects.get(id = model)
        tag = directory.models.Tag(text = value, entity = entity)
        tag.save()
        change_set = register_edit(INSTANCE_CREATED, tag, session, username,
          request.META[u'REMOTE_ADDR'])
        register_edit(TEXT_CHANGED, tag, session, username,
          request.META[u'REMOTE_ADDR'], field_name = u'tag', change_set =
          change_set, text_after = value)
        register_edit(MANY_TO_ONE_RELATIONSHIP_ADDED, tag, session, username,
          request.META[u'REMOTE_ADDR'], change_set = change_set, field_name =
          u'entity', foreign_key_added = entity)
        directory.functions.log_message(u'Tag for Entity ' +
          str(model) + u') added by: ' + request.user.username + u', value: ' +
          value + u'\n')
        return HttpResponse(u'<!--# ' + unicode(change_set) + u' #-->')
    match = re.match(ur'URL_new_(\d+)', html_id)
    if match:
        model = int(match.group(1))
        entity = directory.models.Entity.objects.get(id = model)
        url = directory.models.URL(url = value, entity = entity)
        url.save()
        change_set = register_edit(INSTANCE_CREATED, url, session, username,
          request.META[u'REMOTE_ADDR'])
        register_edit(TEXT_CHANGED, url, session, username,
          request.META[u'REMOTE_ADDR'], field_name = u'url', change_set =
          change_set, text_after = value)
        register_edit(FOREIGN_KEY_RELATIONSHIP_CHANGED, url, session, username,
          request.META[u'REMOTE_ADDR'], change_set = change_set, field_name =
          u'entity', foreign_key_added = entity)
        directory.functions.log_message(u'URL for Entity ' +
          str(model) + u') added by: ' + request.user.username + u', value: ' +
          value + u'\n')
        return HttpResponse(u'<!--# ' + unicode(change_set) + u' #-->')
    match = re.match(ur'Phone_new_(\d+)', html_id)
    if match:
        model = int(match.group(1))
        entity = directory.models.Entity.objects.get(id = model)
        phone = directory.models.Phone(number = value, entity = entity)
        phone.save()
        change_set = register_edit(INSTANCE_CREATED, phone, session, username,
          request.META[u'REMOTE_ADDR'])
        register_edit(TEXT_CHANGED, phone, session, username, 
          request.META[u'REMOTE_ADDR'], change_set = change_set, field_name =
          u'number', text_after = value)
        register_edit(FOREIGN_KEY_RELATIONSHIP_CHANGED, phone, session,
          username, request.META[u'REMOTE_ADDR'], change_set = change_set,
          field_name = u'entity', foreign_key_added = entity)
        directory.functions.log_message(u'Phone for Entity ' +
          str(model) + u') added by: ' + request.user.username + u', value: ' +
          value + u'\n')
        return HttpResponse(u'<!-- #' + unicode(change_set) + u' #-->')
    elif html_id.startswith(u'Entity_department_'):
        entity_id = int(html_id[len(u'Entity_department_'):])
        entity = directory.models.Entity.objects.get(id = entity_id)
        original_department = entity.department
        department_id = int(value[len(u'department.'):])
        if department_id == -1:
            entity.department = None
        else:
            entity.department = directory.models.Entity.objects.get(id =
              department_id)
        if entity.department != original_department:
            change_set = register_edit(FOREIGN_KEY_RELATIONSHIP_CHANGED,
              entity, session, username, request.META[u'REMOTE_ADDR'],
              foreign_key_added = entity.department, foreign_key_deleted =
              original_department)
        directory.functions.log_message(u'Department for Entity ' +
          str(entity_id) + u') set by: ' + request.user.username +
          u', value: ' + value + u'\n')
        entity.save()
        return HttpResponse(value + u'<!--# ' + unicode(change_set) + u' #-->')
    elif html_id.startswith(u'Entity_location_'):
        entity_id = int(html_id[len(u'Entity_location_'):])
        entity = directory.models.Entity.objects.get(id = entity_id)
        location_id = int(value[len(u'location.'):])
        original_location = entity.location
        if location_id == -1:
            entity.location = None
        else:
            entity.location = directory.models.Entity.objects.get(id =
              location_id)
        if entity.location != original_location:
            change_set = register_edit(FOREIGN_KEY_RELATIONSHIP_CHANGED,
              entity, session, username, request.META[u'REMOTE_ADDR'],
              foreign_key_added = entity.location, foreign_key_deleted =
              original_location)
        directory.functions.log_message(u'Location for Entity ' +
          str(entity_id) + u') set by: ' + request.user.username +
          u', value: ' + value + u'\n')
        entity.save()
        return HttpResponse(value + u'<!--# ' + unicode(change_set) + u' #-->')
    elif html_id.startswith(u'Entity_reports_to_'):
        entity_id = int(html_id[len(u'Entity_reports_to_'):])
        entity = directory.models.Entity.objects.get(id = entity_id)
        original_reports_to = entity.reports_to
        reports_to_id = int(value[len(u'reports_to.'):])
        entity = directory.models.Entity.objects.get(id = entity_id)
        if reports_to_id == -1:
            entity.reports_to = None
        else:
            entity.reports_to = directory.models.Entity.objects.get(id =
              reports_to_id)
        if entity.reports_to != original_reports_to:
            change_set = register_edit(FOREIGN_KEY_RELATIONSHIP_CHANGED,
              entity, session, username, request.META[u'REMOTE_ADDR'],
              foreign_key_added = entity.reports_to, foreign_key_deleted =
              original_reports_to)
        directory.functions.log_message(u'reports_to for Entity ' +
          str(entity_id) + u') set by: ' + request.user.username +
          u', value: ' + value + u'\n')
        entity.save()
        return HttpResponse(value + u'<!--# ' + unicode(change_set) + u' #-->')
    else:
        match = re.match(ur'^(.*?)_(.*)_(\d+)$', html_id)
        model = match.group(1)
        field = match.group(2)
        id = int(match.group(3))
        selected_model = get_model(u'directory', model)
        instance = selected_model.objects.get(id = id)
        original_value = getattr(instance, field)
        setattr(instance, field, value)
        instance.save()
        change_set = None
        if original_value != value:
            change_set = register_edit(TEXT_CHANGED, instance, session,
              username, request.META[u'REMOTE_ADDR'], field_name = field,
              text_before = original_value, text_after = value)
        directory.functions.log_message(model + u'.' + field + "(" + str(id) + 
          u') changed by: ' + request.user.username + u' to: ' + value + u'\n')
        if change_set != None:
            return HttpResponse(value + u'<!--# ' + unicode(change_set) + u' #-->')
        else:
            return HttpResponse(value)

@ajax_login_required
def saveimage(request, string_id):
    id = int(string_id)
    entity = directory.models.Entity.objects.filter(id = id)[0]
    original_mimetype = entity.image_mimetype
    file = request.FILES.values()[0]
    extension = file.name.lower().split(".")[-1]
    if extension == u'jpg':
        entity.image_mimetype = u'image/jpeg'
    elif extension == u'swf':
        entity.image_mimetype = u'application/x-shockwave-flash'
    else:
        entity.image_mimetype = u'image/' + extension
    entity.save()
    try:
        os.rename(directory.settings.DIRNAME + u'/static/images/profile/' +
          string_id, directory.settings.DIRNAME + u'/static/images/profile/' +
          string_id + '.old')
    except OSError:
        pass
    save_file = open(directory.settings.DIRNAME + u'/static/images/profile/' +
      string_id, u'wb')
    for chunk in file.chunks():
        save_file.write(chunk)
    directory.functions.log_message(u'Image for entity ' + string_id +
      u' changed by ' + request.user.username +u'".')
    change_set = register_edit(IMAGE_CHANGED, entity,
      request.session.session_key, request.user.username,
      request.META[u'REMOTE_ADDR'], text_before = original_mimetype, text_after
      = entity.image_mimetype)
    result = u'''<img class="profile" src="/profile/images/%d">''' % id + \
      u'<!--# ' + unicode(change_set) + u' #-->'
    return HttpResponse(result)

def search(request):
    try:
        query = request.POST[u'query']
        dictionary = request.POST
    except:
        query = request.GET[u'query']
        dictionary = request.GET
    if query.lower().strip() == "all":
        split_query = []
    else:
        split_query = re.split(ur'(?u)[^-\w]', query)
    while u'' in split_query:
        split_query.remove(u'')
    results = []
    for word in split_query:
        for entity in directory.models.Entity.objects.filter(name__icontains = word):
            if re.match(ur'(?ui)\b' + word + ur'\b', entity.name):
                entry = {u'id': entity.id, u'name': entity.name, u'description': entity.description}
                if not entry in results:
                    results.append(entry)
    for entry in results:
        score = 0
        for word in split_query:
            if re.match(ur'(?ui)\b' + word + ur'\b', entry[u'name']):
                score += 1
        entry[u'score'] = score
    def compare(a, b):
        if cmp(a[u'score'], b[u'score']) == 0:
            return cmp(a[u'name'], b[u'name'])
        else:
            return -cmp(a[u'score'], b[u'score'])
    results.sort(compare)
    try: 
        start = int(dictionary[u'start'])
    except:
        start = 0
    try:
        results_per_page = int(dictionary[u'results_per_page'])
    except:
        results_per_page = RESULTS_PER_PAGE
    returned_results = results[start:start + results_per_page]
    response = HttpResponse(json.dumps([returned_results, len(results)]),
      mimetype = u'application/json')
    return response

@ajax_login_required
def undo(request):
    change_set_id = int(request.REQUEST[u'change_set'])
    change_set = directory.models.EditTrail.objects.filter(change_set =
      change_set_id).order_by(u'-id')
    for change in change_set:
        if change.change_type == FOREIGN_KEY_RELATIONSHIP_CHANGED:
            setattr(change.instance, change.field_name, change.
              foreign_key_deleted)
        elif change.change_type == IMAGE_CHANGED:
            os.rename(settings.DIRNAME + u'/static/profile/images/' +
              unicode(change.instance.id) + '.old', settings.DIRNAME +
              u'/static/profile/images/' + unicode(change.instance.id))
            change.instance.image_mimetype = change.text_before
        elif change.change_type == INSTANCE_CREATED:
            change.instance.is_invisible = True
        elif change.change_type == INSTANCE_DELETED:
            change.instance.is_invisible = False
        elif change.change_type == MANY_TO_MANY_RELATIONSHIP_ADDED:
            getattr(change.instance,
              change.field_name).delete(change.foreign_key_added)
        elif change.change_type == MANY_TO_MANY_RELATIONSHIP_DELETED:
            getattr(change.instance,
              change.field_name).add(change.foreign_key_deleted)
        elif change.change_type == MANY_TO_ONE_RELATIONSHIP_ADDED:
            getattr(change.instance,
              change.field_name).delete(change.foreign_key_added)
        elif change.change_type == MANY_TO_ONE_RELATIONSHIP_DELETED:
            setattr(change.instance, change.field_name,
              change.foreign_key_deleted)
            change.instance.is_invisible = False;
        elif change.change_type == TEXT_CHANGED:
            setattr(change.instance, change.field_name, change.text_before)
        change.instance.save()
        change.in_effect = False
    return HttpResponse(u'')
