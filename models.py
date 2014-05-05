#!/usr/bin/python
# coding = UTF-8

from django.contrib import admin
from django.contrib.contenttypes import generic
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db import models

import datetime
import directory
import django.forms
import re

OFFICE_CHOICES = (
  (u'CN', u'Chicago North Office, Illinois, USA'),
  (u'CS', u'Chicago South Office, Illinois, USA'),
  (u'WH', u'Wheaton Office, Illinois, USA'),
  (u'SY', u'Sydney Office, New South Wales, Australia'),
  )

EDIT_CHOICES = (
  (u'a', u'Foreign key relationship changed.'),
  (u'b', u'Image changed.'),
  (u'c', u'Instance created.'),
  (u'd', u'Instance deleted.'),
  (u'e', u'Many to many relationship added.'),
  (u'f', u'Many to many relationship deleted.'),
  (u'g', u'One to many relationship added.'),
  (u'h', u'One to many relationship deleted.'),
  (u'i', u'Text changed.'),
  )

TIME_ZONE_CHOICES = (
  (None, "Select"),
  ("1.0", "A: Paris, +1:00"),
  ("2.0", "B: Athens, +2:00"),
  ("3.0", "C: Moscow, +3:00"),
  ("4.0", "D: Dubai, +4:00"),
  ("4.5", "-: Kabul, +4:30"),
  ("5.0", "E: Karachi, +5:00"),
  ("5.5", "-: New Delhi, +5:30"),
  ("5.75", "-: Kathmandu, :5:45"),
  ("6.0", "F: Dhaka, +6:00"),
  ("6.5", "-: Rangoon, +6:30"),
  ("7.0", "G: Jakarta, +7:00"),
  ("8.0", "H: Kuala Lumpur, +8:00"),
  ("9.0", "I: Tokyo, +9:00"),
  ("9.5", "-: Adelaide, +9:30"),
  ("10.0", "K: Sydney, +10:00"),
  ("10.5", "-: Lord Howe Island, +10:30"),
  ("11.0", "L: Solomon Islands, +11:00"),
  ("11.5", "-: Norfolk Island, +11:50"),
  ("12.0", "M: Auckland, +12:00"),
  ("12.75", "-: Chatham Islands, +12:45"),
  ("13.0", "-: Tonga, +13:00"),
  ("14.0", "-: Line Islands, +14:00"),
  ("-1.0", "N: Azores, -1:00"),
  ("-2.0", "O: Fernando de Norohna, -2:00"),
  ("-3.0", "P: Rio de Janiero, -3:00"),
  ("-3.5", "-: St. John's, -3:50"),
  ("-4.0", "Q: Santiago, -4:00"),
  ("-4.5", "-: Caracas, -4:30"),
  ("-5.0", "R: New York City, -5:00"),
  ("-6.0", "S: Chicago, -6:00"),
  ("-7.0", "T: Boulder, -7:00"),
  ("-8.0", "U: Los Angeles, -8:00"),
  ("-9.0", "V: Anchorage, -9:00"),
  ("-9.5", "-: Marquesas Islands, -9:30"),
  ("-10.0", "W: Hawaii, -10:00"),
  ("-11.0", "X: Samoa, -11:00"),
  ("-12.0", "Y: Baker Island, -12:00"),
  ("0.0", "Z: London, +0:00"),
  )

FOREIGN_KEY_RELATIONSHIP_CHANGED = u'a'
IMAGE_CHANGED = u'b'
INSTANCE_CREATED = u'c'
INSTANCE_DELETED = u'd'
MANY_TO_MANY_RELATIONSHIP_ADDED = u'e'
MANY_TO_MANY_RELATIONSHIP_DELETED = u'f'
MANY_TO_ONE_RELATIONSHIP_ADDED = u'g'
MANY_TO_ONE_RELATIONSHIP_DELETED = u'h'
TEXT_CHANGED = u'i'

class EditTrail(models.Model):
    change_set = models.IntegerField()
    change_type = models.CharField(max_length = 1, choices = EDIT_CHOICES)
    content_object = generic.GenericForeignKey(u'content_type', u'object_id')
    content_type = models.ForeignKey(ContentType)
    field_name = models.TextField(null = True, blank = True)
    foreign_key_added = generic.GenericForeignKey()
    foreign_key_deleted = generic.GenericForeignKey()
    in_effect = models.BooleanField()
    instance = generic.GenericForeignKey()
    ip = models.IPAddressField()
    object_id = models.PositiveIntegerField()
    session = models.TextField(null = True, blank = True)
    text_after = models.TextField(null = True, blank = True)
    text_before = models.TextField(null = True, blank = True)
    timestamp = models.DateTimeField(default = datetime.datetime.now, blank =
      True)
    username = models.TextField(null = True, blank = True)
    def format_timestamp(self):
        return directory.functions.format_timestamp(self.timestamp)

class ExtensionField(models.TextField):
    def __init__(self, *arguments, **keywords):
        models.TextField.__init__(self, *arguments, **keywords)

def gps_validator(value):
    # Create a normalized working copy of the value.
    working_copy = value
    working_copy = working_copy.replace(u'\n', u',')
    working_copy = working_copy.replace(u'\r', u',')
    working_copy = re.sub(ur',*$', '', working_copy)
    working_copy = re.sub(ur',+', u',', working_copy)
    if not u',' in working_copy and not \
      re.match(ur'.* .* .*', working_copy):
        working_copy = working_copy.replace(u' ', u',')
    working_copy = re.sub(u'[\00B0\2018\2019\201C\201D\'"]', ' ', working_copy)
    working_copy = working_copy.replace(u',', u', ')
    working_copy = re.sub(ur'\s+', u' ', working_copy)
    working_copy = working_copy.strip()
    working_copy = working_copy.upper()
    # Test the normalized working copy against regular expressions for different kinds of GPS format.
    if re.match(ur'[-NS]? ?\d{1,3} [0-5]\d [0-5]\d(\.\d+)[NS]?, [-EW]? ?\d{1,3} [0-5]\d [0-5]\d(\.\d+)[EW]?', working_copy):
        return working_copy
    elif re.match(ur'[-NS]? ?\d{1,3} [0-5]\d(\.\d+)[NS]?, [-EW]? ?\d{1,3} [0-5]\d(\.\d+)[EW]?', working_copy):
        return working_copy
    elif re.match(ur'[-NS]? ?\d{1,3}(\.\d+)[NS]?, [-EW]? ?\d{1,3}(\.\d+)[EW]?', working_copy):
        return working_copy
    else:
        raise ValidationError(u'We could not recognize this as a valid GPS coordinate.')

class GPSField(models.TextField):
    default_error_messages = {
        u'invalid': u'We could not recognize this as a valid GPS coordinate.',
      }
    default_validators = [gps_validator]

class Increment(models.Model):
    pass

class Location(models.Model):
    identifier = models.TextField(blank = True)
    description = models.TextField(blank = True)
    office = models.CharField(max_length=2, choices=OFFICE_CHOICES, blank =
      True)
    postal_address = models.TextField(blank = True)
    room = models.TextField(blank = True)
    coordinates = GPSField(blank = True)

class TextURLField(models.URLField):
    def __init__(self, *arguments, **keywords):
        models.URLField.__init__(self, *arguments, **keywords)
    def get_internal_type(self):
        return u'TextField'

# This class is basically the "Person" class; however, it is called "Entity"
# to emphasize that it is intended to accommodate people, offices,
# organizational units, and possibly other areas.
class Entity(models.Model):
    active = models.BooleanField(blank = True)
    department = models.ForeignKey(u'self', blank = True, null =
      True, related_name = u'member')
    description = models.TextField(blank = True)
    gps = GPSField()
    image_mimetype = models.TextField(blank = True, null = True)
    is_invisible = models.BooleanField(default = False)
    location = models.ForeignKey(u'self', blank = True, null = True,
      related_name = u'occupant')
    name = models.TextField(blank = True, default = u'(Insert name here)')
    observes_daylight_saving_time = models.BooleanField(blank = True, default
      = True)
    other_contact = models.TextField(blank = True)
    postal_address = models.TextField(blank = True)
    publish_externally = models.BooleanField(blank = True)
    reports_to = models.ForeignKey(u'self', blank = True, null = True,
      related_name = u'subordinate')
    start_date = models.DateField(blank = True, null = True)
    time_zone = models.CharField(max_length = 5, null = True, choices =
      TIME_ZONE_CHOICES)
    title = models.TextField(blank = True)
    class Meta:
        permissions = (
          ("view_changelog", "View the editing changelog"),
          )

class Tag(models.Model):
    entity = models.ForeignKey(Entity)
    is_invisible = models.BooleanField(default = False)
    text = models.TextField(blank = True)
    def __eq__(self, other):
        try:
            return self.text == other.text
        except:
            return False

class TextEmailField(models.EmailField):
    #entity = models.ForeignKey(Entity)
    def __init__(self, *arguments, **keywords):
        models.EmailField.__init__(self, *arguments, **keywords)
    def get_internal_type(self):
        return u'TextField'

class Email(models.Model):
    email = TextEmailField()
    entity = models.ForeignKey(Entity)
    is_invisible = models.BooleanField(default = False)

class URL(models.Model):
    entity = models.ForeignKey(Entity)
    url = TextURLField()
    is_invisible = models.BooleanField(default = False)

class Phone(models.Model):
    description = models.TextField(blank = True, null = True)
    entity = models.ForeignKey(Entity, blank = True)
    is_invisible = models.BooleanField(default = False)
    number = models.TextField(blank = True)
    def __eq__(self, other):
        try:
            return self.remove_formatting() == other.remove_formatting()
        except:
            return False
    def remove_formatting(self):
        return re.sub(ur'\D', u'', str(self))

class Status(models.Model):
    datetime = models.DateTimeField(default = datetime.datetime.now, blank = True)
    entity = models.ForeignKey(Entity, blank = True)
    is_invisible = models.BooleanField(default = False)
    text = models.TextField(blank = True)
    username = models.TextField(blank = True)
    def format_timestamp(self):
        return directory.functions.format_timestamp(self.datetime)

class EntityForm(django.forms.ModelForm):
    class Meta:
        model = Entity
        fields = (u'name', u'description', u'phone', u'department',
          u'postal_address', u'reports_to', u'active', u'publish_externally')

class LocationForm(django.forms.ModelForm):
    class Meta:
        model = Location
