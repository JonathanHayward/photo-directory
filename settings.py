#!/usr/bin/python
# coding=UTF-8

# Django settings for directory project.

import os

DEBUG = False
TEMPLATE_DEBUG = DEBUG

DIRNAME = os.path.dirname(__file__)

# These are constants used in the template.
DELAY_BETWEEN_RETRIES = 1
INITIAL_RESULTS = 10
INITIAL_STATI = 5
SHOULD_ALLOW_USERS_TO_CREATE_ACCOUNTS = 1 # 1 or 0, BUT NOT True or False
SHOULD_DOWNLOAD_DIRECTORY = 0 # 1 or 0, BUT NOT True or False
SHOULD_TURN_ON_HIJAXING = 1 # 1 or 0, BUT NOT True or False
# These are weightings used to determine importance in searches.
# The values provided are integer clean, but the code should work for the most
# part with floating point values.
DEPARTMENT_WEIGHT = 30
DESCRIPTION_WEIGHT = 30
LOCATION_WEIGHT = 10
NAME_WEIGHT = 70
STATUS_WEIGHT = 1
TAG_WEIGHT = 50
TITLE_WEIGHT = 50

ADMINS = (
    # ('Your Name', 'your_email@domain.com'),
)

MANAGERS = ADMINS

DATABASE_ENGINE = 'sqlite3'           # 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
DATABASE_NAME = 'directory.sqlite3'             # Or path to database file if using sqlite3.
DATABASE_USER = ''             # Not used with sqlite3.
DATABASE_PASSWORD = ''         # Not used with sqlite3.
DATABASE_HOST = ''             # Set to empty string for localhost. Not used with sqlite3.
DATABASE_PORT = ''             # Set to empty string for default. Not used with sqlite3.

# Relative pathname for user changes logfile for directory
LOGFILE = u'log'

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'America/Chicago'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# Absolute path to the directory that holds media.
# Example: "/home/media/media.lawrence.com/"
MEDIA_ROOT = DIRNAME + '/static/'

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash if there is a path component (optional in other cases).
# Examples: "http://media.lawrence.com", "http://example.com/media/"
MEDIA_URL = '/static/'

# URL prefix for admin media -- CSS, JavaScript and images. Make sure to use a
# trailing slash.
# Examples: "http://foo.com/media/", "/media/".
ADMIN_MEDIA_PREFIX = '/media/'

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'm5c^)jw%wgo&k!w3bqym0v6jwot6ww4ojj8rr%)c_t&n%$p)!i'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.load_template_source',
    'django.template.loaders.app_directories.load_template_source',
#     'django.template.loaders.eggs.load_template_source',
)

MIDDLEWARE_CLASSES = (
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
)

ROOT_URLCONF = 'directory.urls'

TEMPLATE_DIRS = (
    DIRNAME + "/templates",
    # Put strings here, like "/home/html/django_templates" or "C:/www/django/templates".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

INSTALLED_APPS = (
    'directory',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
)