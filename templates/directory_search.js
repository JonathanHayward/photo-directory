var PHOTO_DIRECTORY = new Object();

jQuery(function($)
    {

    try
        {
        console.log("Starting...");
        }
    catch(error)
        {
        console = function()
            {
            }
        console.log = console;
        }

    PHOTO_DIRECTORY.login_offered = false;
    PHOTO_DIRECTORY.last_mouseover_profile = null;

    $(function()
        {
        $.ajaxSetup(
            {
            beforeSend: function(XMLHttpRequest)
                {
                PHOTO_DIRECTORY.login_offered = false;
                },
            complete: function(XMLHttpRequest, textStatus)
                {
                var data = XMLHttpRequest.responseText;
                var regular_expression = new RegExp("<!-" +
                  "-# (\\d+) #-" + "->");
                if (data.match(regular_expression))
                    {
                    var match = regular_expression.exec(data);
                    PHOTO_DIRECTORY.undo_notification(
                      "Your changes have been saved. " +
                      "<a href='JavaScript:PHOTO_DIRECTORY.undo(" +
                      match[1] + ")'>Undo</a>");
                    }
                else if (data == '{"not_permitted": true}' || data ==
                  "{'not_permitted': true}")
                    {
                    PHOTO_DIRECTORY.send_notification(
                      "We're sorry, but we can't allow you to do that.");
                    PHOTO_DIRECTORY.reload_profile();
                    }
                },
            datatype: "json",
            error: function(XMLHttpRequest, textStatus, errorThrown)
                {
                if (XMLHttpRequest.responseText)
                    {
                    {% if settings.DEBUG %}
                        PHOTO_DIRECTORY.send_notification(
                          XMLHttpRequest.responseText);
                    {% else %}
                        PHOTO_DIRECTORY.send_notification(
                          "There was an error handling your request.");
                    {% endif %}
                    }
                },
            type: "POST",
            });
        });

	(function( $ ) {
		$.widget( "ui.combobox", {
			_create: function() {
				var self = this;
				var select = this.element.hide(),
					selected = select.children( ":selected" ),
					value = selected.val() ? selected.text() : "";
				var input = $( "<input>" )
					.insertAfter( select )
					.val( value )
					.autocomplete({
						delay: 0,
						minLength: 0,
						source: function( request, response ) {
							var matcher = new RegExp( $.ui.autocomplete.escapeRegex(request.term), "i" );
							response( select.children( "option" ).map(function() {
								var text = $( this ).text();
								if ( this.value && ( !request.term || matcher.test(text) ) )
									return {
										label: text.replace(
											new RegExp(
												"(?![^&;]+;)(?!<[^<>]*)(" +
												$.ui.autocomplete.escapeRegex(request.term) +
												")(?![^<>]*>)(?![^&;]+;)", "gi"
											), "<strong>$1</strong>" ),
										value: text,
										option: this
									};
							}) );
						},
						select: function( event, ui ) {
							ui.item.option.selected = true;
							//select.val( ui.item.option.value );
							self._trigger( "selected", event, {
								item: ui.item.option
							});
						},
						change: function( event, ui ) {
							if ( !ui.item ) {
								var matcher = new RegExp( "^" + $.ui.autocomplete.escapeRegex( $(this).val() ) + "$", "i" ),
									valid = false;
								select.children( "option" ).each(function() {
									if ( this.value.match( matcher ) ) {
										this.selected = valid = true;
										return false;
									}
								});
								if ( !valid ) {
									// remove invalid value, as it didn't match anything
									$( this ).val( "" );
									select.val( "" );
									return false;
								}
							}
                            PHOTO_DIRECTORY.update_autocomplete_handler(event,
                              ui);
						}
					})
					.addClass( "ui-widget ui-widget-content ui-corner-left" );

				input.data( "autocomplete" )._renderItem = function( ul, item ) {
					return $( "<li></li>" )
						.data( "item.autocomplete", item )
						.append( "<a>" + item.label + "</a>" )
						.appendTo( ul );
				};

				$( "<button>&nbsp;</button>" )
					.attr( "tabIndex", -1 )
					.attr( "title", "Show All Items" )
					.insertAfter( input )
					.button({
						icons: {
							primary: "ui-icon-triangle-1-s"
						},
						text: false
					})
					.removeClass( "ui-corner-all" )
					.addClass( "ui-corner-right ui-button-icon" )
					.click(function() {
						// close if already visible
						if ( input.autocomplete( "widget" ).is( ":visible" ) ) {
							input.autocomplete( "close" );
							return;
						}

						// pass empty string as value to search for, displaying all results
						input.autocomplete( "search", "" );
						input.focus();
					});
			}
		});
	})(jQuery);

    PHOTO_DIRECTORY.Emails = [];
    PHOTO_DIRECTORY.Entities = [];
    PHOTO_DIRECTORY.Entities_by_id = [];
    PHOTO_DIRECTORY.Phones = [];
    PHOTO_DIRECTORY.Stati = [];
    PHOTO_DIRECTORY.Tags = [];
    PHOTO_DIRECTORY.Tags_by_id = [];
    PHOTO_DIRECTORY.URLs = [];

    PHOTO_DIRECTORY.current_profile = {{ id|default:"null" }} ;
    PHOTO_DIRECTORY.database_loaded = false;
    PHOTO_DIRECTORY.last_attempted_function = null;
    PHOTO_DIRECTORY.logged_in = false;
    PHOTO_DIRECTORY.no_network = false;
    PHOTO_DIRECTORY.tables_loaded = 0;
    PHOTO_DIRECTORY.tables_available = 6;

    PHOTO_DIRECTORY.DELAY_BETWEEN_RETRIES =
      {{ settings.DELAY_BETWEEN_RETRIES }};
    PHOTO_DIRECTORY.INITIAL_STATI = {{ settings.INITIAL_STATI }};
    PHOTO_DIRECTORY.INITIAL_RESULTS = {{ settings.INITIAL_RESULTS }};
    PHOTO_DIRECTORY.SHOULD_DOWNLOAD_DIRECTORY =
      {{ settings.SHOULD_DOWNLOAD_DIRECTORY }};
    PHOTO_DIRECTORY.SHOULD_TURN_ON_HIJAXING =
      {{ settings.SHOULD_TURN_ON_HIJAXING }};

    PHOTO_DIRECTORY.DEPARTMENT_WEIGHT = {{ settings.DEPARTMENT_WEIGHT }};
    PHOTO_DIRECTORY.DESCRIPTION_WEIGHT = {{ settings.DESCRIPTION_WEIGHT }};
    PHOTO_DIRECTORY.LOCATION_WEIGHT = {{ settings.LOCATION_WEIGHT }};
    PHOTO_DIRECTORY.NAME_WEIGHT = {{ settings.NAME_WEIGHT }};
    PHOTO_DIRECTORY.STATUS_WEIGHT = {{ settings.STATUS_WEIGHT }};
    PHOTO_DIRECTORY.TAG_WEIGHT = {{ settings.TAG_WEIGHT }};
    PHOTO_DIRECTORY.TITLE_WEIGHT = {{ settings.TITLE_WEIGHT }};

    PHOTO_DIRECTORY.add_new = function()
        {
        $.ajax({
            success: function(data, textStatus, XMLHttpRequest)
                {
                if (PHOTO_DIRECTORY.check_authentication(data))
                    {
                    PHOTO_DIRECTORY.Entities[PHOTO_DIRECTORY.Entities.length] =
                      data[0];
                    PHOTO_DIRECTORY.Entities_by_id[data[0].pk] = data[0];
                    PHOTO_DIRECTORY.load_profile(data[0].pk);
                    }
                else
                    {
                    PHOTO_DIRECTORY.last_attempted_function =
                      PHOTO_DIRECTORY.add_new;
                    PHOTO_DIRECTORY.offer_login();
                    }
                },
            url: "/ajax/new/Entity",
            });
        }

    PHOTO_DIRECTORY.ajax_file_upload = function()
        {
        //starting setting some animation when the ajax starts and completes
        $("#loading")
        .ajaxStart(function()
            {
            $(this).show();
            })
        .ajaxComplete(function()
            {
            $(this).hide();
            });
            /*
                prepareing ajax file upload
                url: the url of script file handling the uploaded files
                            fileElementId: the file type of input element id
                            and it will be the index of  $_FILES Array()
                dataType: it support json, xml
                secureuri:use secure protocol
                success: call back function when the ajax complete
                error: callback function when the ajax failed
                
                    */
        $.ajaxFileUpload(
            {
            url: '/ajax/saveimage/' + PHOTO_DIRECTORY.current_profile, 
            secureuri: false,
            fileElementId: 'image',
            dataType: 'json',
            success: function(data, status)
                {
                if (!PHOTO_DIRECTORY.check_authentication(data))
                    {
                    PHOTO_DIRECTORY.offer_login();
                    }
                },
            });
        return false;
        } 

    PHOTO_DIRECTORY.bad_network_connection = function()
        {
        PHOTO_DIRECTORY.SHOULD_TURN_ON_HIJAXING = 1;
        $("#search_form").submit(function(event)
            {
            PHOTO_DIRECTORY.search();
            return false;
            });
        $("#bad_network_connection").hide("slow");
        if (PHOTO_DIRECTORY.tables_loaded < PHOTO_DIRECTORY.tables_available)
            {
            PHOTO_DIRECTORY.load_database();
            PHOTO_DIRECTORY.no_network = true;
            PHOTO_DIRECTORY.send_notification(
              "Once everything's loaded, you should be able to use the " +
                "directory whether or not you have network access.");
            }
        else
            {
            PHOTO_DIRECTORY.no_network = true;
            send_notification("You should be able to browse the database " +
              "whether or not you have good network access.");
            }
        PHOTO_DIRECTORY.search();
        PHOTO_DIRECTORY.reload_profile();
        }

    PHOTO_DIRECTORY.build_profile = function(id)
        {
        var result = "<h2>People, etc.</h2>\n";
        if (PHOTO_DIRECTORY.Entities)
            {
            var entity = PHOTO_DIRECTORY.Entities_by_id[id];
            if (entity)
                {
                result += "<div class='deletion'>\n";
                result += "<span class='delete' id='Entity_" + id +
                  "'>Delete \"" + entity.fields.name + "\"</span>\n";
                result += "</div>";
                result += "<h3 id='Entity_name_" + id +
                  "' title='Click to edit.' class='edit'>";
                result += entity.fields.name;
                result += "</h3>\n";
                result += "<div class='image'>";
                result += "<form id='image_upload' name='image_upload' " + 
                  "action='/ajax/saveimage/" + id +
                  "' method='POST' enctype='multipart/form-data'>\n";
                if (entity.fields.image_mimetype)
                    {
                    result += "<img class='profile' src='/profile/images/" +
                      id + " />\n";
                    }
                else
                    {
                    result += "<div id='image_slot'></div>\n";
                    result += "Upload image:<br />\n";
                    }
                result += "<input type='file' name='image' id='image' />" +
                  "<br />\n";
                result += "<button class='button' id='upload' " +
                  "onclick='return PHOTO_DIRECTORY.ajax_file_upload(" + id +
                  ");'>Upload</button>\n";
                result += "</form>";
                result += "</div>";
                result += "<p>Title: <strong id='entity_title_" + id +
                  "' title='Click to edit.' class='edit'>";
                result += entity.fields.title;
                result += "</strong></p>\n";
                result += "<p>Description: <strong id='Entity_description_" +
                  id + "' title='Click to edit.' class='edit_textarea'>";
                result += entity.fields.description;
                result += "</strong><p>\n";
                result += "<p>Tags: <strong>";
                entity.fields.tags.sort();
                for(var index = 0; index < entity.fields.tags.length; ++index)
                    {
                    result += "<span class='tag'>" +
                      PHOTO_DIRECTORY.Tags_by_id[
                      entity.fields.tags[index]].fields.text +
                      "</span> " + "<span class='delete' id='Tag_" +
                      entity.fields.tags[index] + "'>&#10008;</span> &nbsp;\n";
                    }
                result += "<span class='edit' id='Entity_tag_new_" + id +
                  "'></span>";
                result += "</strong></p>\n";
                result += "<p>Phone: <strong>";
                for (var index = 0; index < PHOTO_DIRECTORY.Phones.length;
                  ++index)
                    {
                    if (PHOTO_DIRECTORY.Phones[index].fields.entity == id)
                        {
                        result += "<span id='Phone_" +
                          PHOTO_DIRECTORY.Phones[index].pk +
                          "' class='edit' title='Click to edit.'>" +
                          PHOTO_DIRECTORY.Phones[index].fields["number"] +
                          "</span> &nbsp;\n<span class='delete' id='Phone_" +
                          PHOTO_DIRECTORY.Phones[index].pk +
                          "'>&#10008;</span>" + " &nbsp;\n";
                        }
                    }
                result += "<span class='edit' title='Click to add.' " +
                  "id='Phone_new_" + id + "'></span>";
                result += "</strong></p>\n";
                result += "<p>Email: <strong>";
                for (var index = 0; index < PHOTO_DIRECTORY.Emails.length;
                  ++index)
                    {
                    if (PHOTO_DIRECTORY.Emails[index].fields.entity == id)
                        {
                        result += "<a id='Email_" +
                          PHOTO_DIRECTORY.Emails[index].pk +
                          "' class='edit_rightclick' " +
                          " title='RIGHT click to edit.' href='mailto:" +
                          PHOTO_DIRECTORY.Emails[index].fields.email + "'>" +
                          PHOTO_DIRECTORY.Emails[index].fields.email + "</a> " +
                          "<span class='delete' id='Email_" +
                          PHOTO_DIRECTORY.Emails[index].pk +
                          "'>&#10008;</span>" + " &nbsp;\n";
                        }
                    }
                result += "<span class='edit' title='Click to edit.' " +
                  "id='Email_new_" + id + "'></span>";
                result += "</strong></p>\n";
                result += "<p>Webpages: <strong>";
                for (var index = 0; index < PHOTO_DIRECTORY.URLs.length;
                  ++index)
                    {
                    if (PHOTO_DIRECTORY.URLs[index].fields.entity == id)
                        {
                        if (PHOTO_DIRECTORY.URLs[index].fields["url"]
                          .indexOf(":") > -1)
                            {
                            var prefix = "";
                            }
                        else
                            {
                            var prefix = "http://";
                            }
                        result += "<a id='URL_url_" +
                          PHOTO_DIRECTORY.URLs[index].pk +
                          "' class='edit_rightclick' " +
                          " title='RIGHT click to edit.' href='" + prefix +
                          PHOTO_DIRECTORY.URLs[index].fields["url"] + "'>" +
                          PHOTO_DIRECTORY.URLs[index].fields["url"] + "</a> " + 
                          "<span class='delete' id='URL_" +
                          PHOTO_DIRECTORY.URLs[index].pk +
                          "'>&#10008;</span>" + " &nbsp;\n";
                        }
                    }
                result += "<span class='edit' title='Click to add.' " +
                  "id='URL_new_" + id + "'></span>";
                result += "</strong></p>\n";
                result += "<p>GPS: <strong";
                var gps = "";
                var gps_url = "";
                if (entity.fields.gps)
                    {
                    gps = entity.fields.gps;
                    }
                else if (entity.fields["location"])
                    {
                    if (PHOTO_DIRECTORY.Entities_by_id[
                      entity.fields["location"]].gps)
                        {
                        gps = PHOTO_DIRECTORY.Entities_by_id[
                          entity.fields["location"]].gps;
                        }
                    }
                if (gps)
                    {
                    gps_url =
                      "http://maps.google.com/maps?f=q&source=s_q&hl=en&q=" +
                      gps.replace(" ", "+") + "&iwloc=A&hl=en";
                    result += "><a class='edit_rightclick' " +
                      "title='Click to edit.' " + "id='Entity_gps_" +
                      entity.pk + "' href='" + gps_url + "'>" + gps + "</a>";
                    }
                else
                    {
                    result += " class='edit' title='Click to edit.'";
                    result += " id='Entity_gps_" + entity.pk + "'>";
                    }
                result += "</strong></p>";
                result += "<p>Postal address:<br /><strong " +
                  "id='Entity_postal_address_" + id +
                  "' title='Click to edit.' class='edit_textarea'>";
                result += entity.fields.postal_address;
                result += "</strong></p>\n";
                result += "<p>Other contact information: <strong ";
                result += "class='edit_textarea' title='Click to edit.' " +
                  "id='Entity_other_contact_" + id + "'>" +
                  entity.fields.other_contact + "</strong></p>\n";
                result += "<p>Time zone: ";
                result += "<select name='time_zone' id='time_zone'";
                result += "onchange='PHOTO_DIRECTORY.update_autocomplete(\"Entity_time_zone_{{ id }}\", \"time_zone\");'>";
                {% for time_zone in time_zones %}
                    result += "<option value='{{ time_zone.0 }}'>";
                    result += "{{ time_zone.1 }}</option>\n";
                {% endfor %}
                result += "</select><br />\n";
                result += "Observes daylight saving time: ";
                result += "<input type='checkbox' ";
                result += "name='observes_daylight_saving_time' ";
                result += "id='observes_daylight_saving_time' ";
                result += "onchange='PHOTO_DIRECTORY.update_autocomplete(";
                result += '"Entity_observes_daylight_saving_time_';
                result += id;
                result += '", "observes_daylight_saving_time");';
                result += "'";
                if (entity.fields.observes_daylight_saving_time)
                    {
                    result += " checked='checked'";
                    }
                result += " /></p>";
                if (entity.fields.time_zone)
                    {
                    result += "<p>Local time:";
                    result += "<span id='local_time_zone'>";
                    result += entity.fields.time_zone;
                    result += "</span><span id='local_time'></span></p>";
                    }
                result += "<p>Department: <strong>";
                if (entity.fields.department)
                    {
                    result += "<a href='/?query=" + escape({{ query }}) +
                      "&id=" + entity.fields.department + "' " +
                      "onclick='PHOTO_DIRECTORY.load_profile(" +
                      entity.fields.department + "); return false;'>";
                    result +=
                      PHOTO_DIRECTORY.Entities_by_id[entity.fields.department].
                      fields.name;
                    result += "</a>";
                    }
                result += " &nbsp; <select name='department' id='department'" +
                  "class='autocomplete' onchange='PHOTO_DIRECTORY.update_autocomplete(" +
                  '"Entity_department_' + id +
                  '", "department");' + "'>\n";
                result += "<option ";
                if (!entity.fields.department)
                    {
                    result += " selected='selected'";
                    }
                result += "value='department.-1'></option>\n";
                for(var index = 0; index < PHOTO_DIRECTORY.Entities.length;
                  ++index)
                    {
                    result += "<option ";
                    if (PHOTO_DIRECTORY.Entities[index].pk ==
                      entity.fields.department)
                        {
                        result += " selected='selected'";
                        }
                    result += " value='department." +
                      PHOTO_DIRECTORY.Entities[index].pk + "'>";
                    result += PHOTO_DIRECTORY.Entities[index].fields.name;
                    result += "</option>\n";
                    }
                result += "</select></strong></p>\n";
                result += "<p>Location: <strong>";
                if (entity.fields["location"])
                    {
                    result += "<a href='/?query=" + escape({{ query }}) +
                      "&id=" + entity.fields["location"] + "' " +
                      "onclick='PHOTO_DIRECTORY.load_profile(" +
                      entity.fields["location"] + "); return false;'>";
                    result += PHOTO_DIRECTORY.Entities_by_id[
                      entity.fields["location"]].fields.name;
                    result += "</a>";
                    }
                result += " &nbsp; <select name='location' id='location' " +
                  "class='autocomplete' " + 
                  "onchange='PHOTO_DIRECTORY.update_autocomplete(\"Entity_location_" + id +
                  "\", \"location\");'>\n";
                result += "<option";
                if (!entity.fields["location"])
                    {
                    result += " selected='selected'";
                    }
                result += " value='location.-1'></option>\n";
                for(var index = 0; index < PHOTO_DIRECTORY.Entities.length;
                  ++index)
                    {
                    result += "<option";
                    if (PHOTO_DIRECTORY.Entities[index].pk ==
                      entity.fields["location"])
                        {
                        result += " selected='selected'";
                        }
                    result += " value='location." +
                      PHOTO_DIRECTORY.Entities[index].pk + "'>";
                    result += PHOTO_DIRECTORY.Entities[index].fields.name;
                    result += "</option>\n";
                    }
                result += "</select></strong></p>\n";
                result += "<p>Reports to: <strong>";
                if (entity.fields.reports_to)
                    {
                    result += "<a href='/?query=" + escape({{ query }}) +
                      "&id=" + entity.fields.reports_to + "' " +
                      "onclick='PHOTO_DIRECTORY.load_profile(" +
                      entity.fields.reports_to + "); return false;'>";
                    result += PHOTO_DIRECTORY.Entities_by_id[
                      entity.fields.reports_to].fields.name;
                    result += "</a>";
                    }
                result += " &nbsp; <select name='reports_to' id='reports_to'" +
                  " class='autocomplete'" +
                  " onchange='PHOTO_DIRECTORY.update_autocomplete(\"Entity_reports_to_" + id +
                  "\", \"reports_to\");'>\n";
                result += "<option";
                if (!entity.fields.reports_to)
                    {
                    result += " selected='selected'";
                    }
                result += " value='reports_to.-1'></option>\n";
                for(var index = 0; index < PHOTO_DIRECTORY.Entities.length;
                  ++index)
                    {
                    result += "<option"
                    if (PHOTO_DIRECTORY.Entities[index].pk ==
                      entity.fields.reports_to)
                        {
                        result += " selected='selected'";
                        }
                    result += " value='reports_to." +
                      PHOTO_DIRECTORY.Entities[index].pk + "'>";
                    result += PHOTO_DIRECTORY.Entities[index].fields.name;
                    result += "</option>\n";
                    }
                result += "</select></strong></p>\n";
                result += "<p>Start date: <strong>";
                if (entity.fields.start_date)
                    {
                    result += entity.fields.start_date;
                    }
                result += "</strong></p>\n";
                result += "<p>Status:</p>";
                result += "<div class='edit_textarea' ";
                result += "id='Status_new_" + id + "'></div>";
                var entity_stati = [];
                for(var index = 0; index < PHOTO_DIRECTORY.Stati.length;
                  ++index)
                    {
                    if (PHOTO_DIRECTORY.Stati[index].fields.entity == id)
                        {
                        entity_stati[entity_stati.length] =
                          PHOTO_DIRECTORY.Stati[index];
                        }
                    }
                var sort_comparison = function(first_status, second_status)
                    {
                    if (first_status.fields.datetime >
                      second_status.fields.datetime)
                        {
                        return -1;
                        }
                    if (first_status.fields.datetime ==
                      second_status.fields.datetime)
                        {
                        return 0;
                        }
                    if (first_status.fields.datetime <
                      second_status.fields.datetime)
                        {
                        return 1;
                        }
                    }
                entity_stati.sort(sort_comparison);
                for(var index = 0; index < entity_stati.length; ++index)
                    {
                    if (index == PHOTO_DIRECTORY.INITIAL_STATI)
                        {
                        result += "<p><a class='show_additional_stati' ";
                        result +=
                          "href='JavaScript:PHOTO_DIRECTORY.show_additional(\"stati\")';>";
                        result += "<span class='emphasized'>+</span> ";
                        result += "Show all</a></p>";
                        result += "<div id='additional_stati'>";
                        }
                    result += "<p>" + entity_stati[index].fields.text +
                      "<br />" + entity_stati[index].fields.username +
                      ", <span class='timestamp'>";
                    var displayed_date = "";
                    var days = ["Sunday", "Monday", "Tuesday", "Wednesday",
                      "Thursday", "Friday", "Saturday"];
                    var months = ["January", "February", "March", "April",
                      "May", "June", "July", "August", "September", "November",
                      "December"];
                    var datetime = entity_stati[index].field.datetime;
                    var weekday_date = Date();
                    weekday_date.setFullYear(parseInt(substr(datetime, 0, 4)));
                    weekday_date.setMonth(parseInt(substr(datetime, 5, 2)));
                    weekday_date.setDate(parseInt(substr(datetime, 7, 2)));
                    var ampm = "AM";
                    var hours = parseInt(substr(datetime, 11, 2));
                    if (hours > 11)
                        {
                        hours -= 12;
                        ampm = "PM"
                        }
                    if (hours == 0)
                        {
                        hours = 12;
                        }
                    displayed_date += "" + hours + substr(datetime, 13, 3);
                    displayed_date += " " + ampm;
                    displayed_date += ", " + days[weekday_date.getDay()];
                    displayed_date += months[parseInt(substr(datetime, 5, 2))];
                    displayed_date += " " + parseInt(substr(datetime, 7, 2));
                    displayed_date += ", " + substr(datetime, 0, 4);
                    result += displayed_date;
                    console.log(displayed_date);
                    result += "</span></p>";
                    }
                if (entity_stati.length > PHOTO_DIRECTORY.INITIAL_STATI)
                    {
                    result += "</div>";
                    }
                return result;
                }
            else
                {
                throw "That profile has not been found.";
                }
            }
        else
            {
            throw "The database has not been loaded.";
            }
        }

    PHOTO_DIRECTORY.check_authentication = function(parsed_json)
        {
        if (parsed_json == '{"not_authenticated": true}')
            {
            PHOTO_DIRECTORY.logged_in = false;
            return false;
            }
        try
            {
            if (parsed_json.not_authenticated)
                {
                PHOTO_DIRECTORY.logged_in = false;
                return false;
                }
            else
                {
                PHOTO_DIRECTORY.logged_in = true;
                return true;
                }
            PHOTO_DIRECTORY.logged_in = true;
            return true;
            }
        catch(error)
            {
            PHOTO_DIRECTORY.logged_in = false;
            return false;
            }
        }

    PHOTO_DIRECTORY.check_login = function()
        {
        var result = $.ajax({
            success: function(data, textStatus, XMLHttpRequest)
                {
                if (PHOTO_DIRECTORY.check_authentication(data))
                    {
                    PHOTO_DIRECTORY.logged_in = true;
                    $("#login_or_logout").html("&bull; <a href='JavaScript:PHOTO_DIRECTORY.logout_link();'>Log out</a>");
                    }
                else
                    {
                    PHOTO_DIRECTORY.logged_in = false;
                    $("#login_or_logout").html("&bull; <a href='JavaScript:PHOTO_DIRECTORY.login_link();'>Log in</a>");
                    }
                },
            url: "/ajax/check_login",
            });
        }

    PHOTO_DIRECTORY.click_profile = function(profile)
        {
        if (PHOTO_DIRECTORY.SHOULD_TURN_ON_HIJAXING)
            {
            document.location = "/?query=" +
              escape(document.search_form.query.value) + "&id=" + profile;
            }
        else
            {
            PHOTO_DIRECTORY.load_profile(profile);
            }
        }

    PHOTO_DIRECTORY.count_tokens = function(raw, match)
        {
        var result = 0;
        var tokens = PHOTO_DIRECTORY.get_tokens(raw);
        for(var index = 0; index < tokens.length; ++index)
            {
            if (tokens[index] == match)
                {
                ++result;
                }
            }
        return result;
        }

    PHOTO_DIRECTORY.dismiss_undo = function()
        {
        console.log("In dismiss_undo().");
        $("div.undo_notifications").hide("slow");
        }

    PHOTO_DIRECTORY.field_sync = function(from, to)
        {
        document.getElementById(to).value =
          document.getElementById(from).value;
        }

    PHOTO_DIRECTORY.get_tokens = function(text)
        {
        var lowercase = text.toLowerCase();
        var current_token = "";
        var in_token = false;
        var result = [];
        for(var index = 0; index < lowercase.length; ++index)
            {
            if (!lowercase[index].match(/[^-\w]/))
                {
                in_token = true;
                current_token += lowercase[index];
                }
            else
                {
                if (current_token)
                    {
                    result[result.length] = current_token;
                    current_token = "";
                    }
                in_token = false;
                }
            }
        if (current_token)
            {
            result[result.length] = current_token;
            }
        return result;
        }

    PHOTO_DIRECTORY.hide_additional = function(name)
        {
        $(".show_additional_" + name).hide();
        $("#additional_" + name).show("slow");
        }

    PHOTO_DIRECTORY.hide_element = function(name)
        {
        $("#hide_" + name).hide();
        $("#show_" + name).show();
        $("#" + name + "_visible").hide();
        $("#" + name + "_hidden").show();
        }

    PHOTO_DIRECTORY.load_current_profile = function()
        {
        if (PHOTO_DIRECTORY.tables_loaded >= PHOTO_DIRECTORY.tables_available)
            {
            PHOTO_DIRECTORY.load_profile(PHOTO_DIRECTORY.current_profile);
            }
        else
            {
            if (PHOTO_DIRECTORY.current_profile)
                {
                $("#profile").load("/ajax/profile/" + PHOTO_DIRECTORY.current_profile,
                  PHOTO_DIRECTORY.register_update);
                }
            else
                {
                $("#profile").html("<h2>People, etc.</h2>");
                }
            }
        }

    PHOTO_DIRECTORY.load_profile = function(id)
        {
        PHOTO_DIRECTORY.current_profile = id;
        if (PHOTO_DIRECTORY.SHOULD_TURN_ON_HIJAXING)
            {
            try
                {
                $("#profile").html(PHOTO_DIRECTORY.build_profile(id));
                if (PHOTO_DIRECTORY.entities[id].fields.time_zone != null)
                    {
                    $("#time_zone").val(PHOTO_DIRECTORY.entities[id].fields.time_zone);
                    }
                PHOTO_DIRECTORY.register_update();
                }
            catch(error)
                {
                if (PHOTO_DIRECTORY.current_profile)
                    {
                    $("#profile").load("/ajax/profile/" +
                      PHOTO_DIRECTORY.current_profile,
                      PHOTO_DIRECTORY.register_update);
                    }
                else
                    {
                    $("#profile").html("");
                    }
                }
            }
        else
            {
            if (PHOTO_DIRECTORY.current_profile)
                {
                $("#profile").load("/ajax/profile/" +
                  PHOTO_DIRECTORY.current_profile,
                  PHOTO_DIRECTORY.register_update);
                }
            else
                {
                $("#profile").html("");
                }
            }
        }

    PHOTO_DIRECTORY.limit_width = function(css_class, limit)
        {
        $(css_class).each(function(index, element)
            {
            if ($(element).width() == 0)
                {
                setTimeout("PHOTO_DIRECTORY.limit_width('" + css_class +
                  "', " + limit + ");", PHOTO_DIRECTORY.DELAY_BETWEEN_RETRIES);
                }
            if ($(element).width() > limit)
                {
                var height = Math.ceil($(element).height() * limit /
                  $(element).width());
                $(element).width(limit);
                $(element).height(height);
                }
            });
        }

    PHOTO_DIRECTORY.load_database = function()
        {
        if (PHOTO_DIRECTORY.no_network ||
          !PHOTO_DIRECTORY.SHOULD_DOWNLOAD_DIRECTORY)
            {
            return;
            }
        $.ajax(
            {
            success: function(data, textStatus, XMLHttpRequest)
                {
                if (PHOTO_DIRECTORY.check_authentication(data))
                    {
                    if (PHOTO_DIRECTORY.Emails.length == 0)
                        {
                        PHOTO_DIRECTORY.tables_loaded += 1;
                        }
                    PHOTO_DIRECTORY.Emails = data;
                    if (PHOTO_DIRECTORY.tables_loaded >=
                      PHOTO_DIRECTORY.tables_available)
                        {
                        PHOTO_DIRECTORY.database_loaded = true;
                        }
                    }
                },
            url: "/ajax/download/Email",
            });
        $.ajax(
            {
            success: function(data, textStatus, XMLHttpRequest)
                {
                if (PHOTO_DIRECTORY.check_authentication(data))
                    {
                    if (PHOTO_DIRECTORY.Entities.length == 0)
                        {
                        PHOTO_DIRECTORY.tables_loaded += 1;
                        }
                    PHOTO_DIRECTORY.Entities = data;
                    PHOTO_DIRECTORY.Locations = data;
                    for(var index = 0; index < PHOTO_DIRECTORY.Entities.length;
                      ++index)
                        {
                        PHOTO_DIRECTORY.Entities_by_id[
                          PHOTO_DIRECTORY.Entities[index].pk] =
                          PHOTO_DIRECTORY.Entities[index];
                        }
                    if (PHOTO_DIRECTORY.tables_loaded >=
                      PHOTO_DIRECTORY.tables_available)
                        {
                        PHOTO_DIRECTORY.database_loaded = true;
                        }
                    }
                },
            url: "/ajax/download/Entity",
            });
        $.ajax(
            {
            success: function(data, textStatus, XMLHttpRequest)
                {
                if (PHOTO_DIRECTORY.check_authentication(data))
                    {
                    PHOTO_DIRECTORY.tables_loaded += 1;
                    PHOTO_DIRECTORY.Phones = data;
                    if (PHOTO_DIRECTORY.tables_loaded >=
                      PHOTO_DIRECTORY.tables_available)
                        {
                        PHOTO_DIRECTORY.database_loaded = true;
                        }
                    }
                },
            url: "/ajax/download/Phone",
            });
        $.ajax(
            {
            success: function(data, textStatus, XMLHttpRequest)
                {
                if (PHOTO_DIRECTORY.check_authentication(data))
                    {
                    PHOTO_DIRECTORY.tables_loaded += 1;
                    PHOTO_DIRECTORY.Stati = data;
                    if (PHOTO_DIRECTORY.tables_loaded >=
                      PHOTO_DIRECTORY.tables_available)
                        {
                        PHOTO_DIRECTORY.database_loaded = true;
                        }
                    }
                },
            url: "/ajax/download/Status",
            });
        $.ajax(
            {
            success: function(data, textStatus, XMLHttpRequest)
                {
                if (PHOTO_DIRECTORY.check_authentication(data))
                    {
                    PHOTO_DIRECTORY.tables_loaded += 1;
                    PHOTO_DIRECTORY.Tags = data;
                    for(var index = 0; index < PHOTO_DIRECTORY.Tags.length;
                      ++index)
                        {
                        PHOTO_DIRECTORY.Tags_by_id[
                          PHOTO_DIRECTORY.Tags[index].pk] =
                          PHOTO_DIRECTORY.Tags[index];
                        }
                    if (PHOTO_DIRECTORY.tables_loaded >=
                      PHOTO_DIRECTORY.tables_available)
                        {
                        PHOTO_DIRECTORY.database_loaded = true;
                        }
                    }
                },
            url: "/ajax/download/Tag",
            });
        $.ajax(
            {
            success: function(data, textStatus, XMLHttpRequest)
                {
                if (PHOTO_DIRECTORY.check_authentication(data))
                    {
                    PHOTO_DIRECTORY.tables_loaded += 1;
                    PHOTO_DIRECTORY.URLs = data;
                    if (PHOTO_DIRECTORY.tables_loaded >=
                      PHOTO_DIRECTORY.tables_available)
                        {
                        PHOTO_DIRECTORY.database_loaded = true;
                        }
                    }
                },
            url: "/ajax/download/URL",
            });
        }

    PHOTO_DIRECTORY.login_link = function()
        {
        PHOTO_DIRECTORY.last_attempted_function = function()
            {
            $("#login_or_logout").html("&bull; <a href='JavaScript:PHOTO_DIRECTORY.logout_link();'>Log out</a>");
            }
        PHOTO_DIRECTORY.offer_login();
        }

    PHOTO_DIRECTORY.logout_link = function()
        {
        $.ajax({
            url: "/ajax/logout",
            });
        $("#login_or_logout").html("&bull; <a href='JavaScript:PHOTO_DIRECTORY.login_link();'>Log in</a>");
        }

    PHOTO_DIRECTORY.mouseover_profile = function(profile)
        {
        if (profile != PHOTO_DIRECTORY.last_mouseover_profile)
            {
            PHOTO_DIRECTORY.load_profile(profile);
            PHOTO_DIRECTORY.last_mouseover_profile = profile;
            PHOTO_DIRECTORY.register_editables();
            }
        }

    PHOTO_DIRECTORY.offer_login = function()
        {
        PHOTO_DIRECTORY.login_offered = true;
        $("#login_form").dialog("open");
        }

    PHOTO_DIRECTORY.register_autocomplete = function()
        {
        $(".autocomplete").combobox();
        }

    PHOTO_DIRECTORY.register_editables = function()
        {
        $(".delete").each(function(index, item)
            {
            var id = item.id;
            $(item).click(function()
                {
                $.ajax(
                    {
                    data:
                        {
                        id: id,
                        },
                    datatype: "html",
                    success: function(data)
                        {
                        if (PHOTO_DIRECTORY.check_authentication(data))
                            {
                            PHOTO_DIRECTORY.reload_profile();
                            }
                        else
                            {
                            PHOTO_DIRECTORY.last_function_called =
                              PHOTO_DIRECTORY.reload_profile;
                            PHOTO_DIRECTORY.offer_login();
                            }
                        },
                    url: "/ajax/delete",
                    });
                });
            });
        $(".edit").editable("/ajax/save",
            {
            callback: function(data)
                {
                if (PHOTO_DIRECTORY.check_authentication(data))
                    {
                    PHOTO_DIRECTORY.reload_profile();
                    }
                else
                    {
                    PHOTO_DIRECTORY.last_function_called =
                      PHOTO_DIRECTORY.reload_profile;
                    PHOTO_DIRECTORY.offer_login();
                    }
                },
            cancel: "Cancel",
            submit: "OK",
            });
        $(".edit_rightclick").editable("/ajax/save",
            {
            cancel: "Cancel",
            callback: function(data)
                {
                if (PHOTO_DIRECTORY.check_authentication(data))
                    {
                    PHOTO_DIRECTORY.reload_profile();
                    }
                else
                    {
                    PHOTO_DIRECTORY.last_function_called =
                      PHOTO_DIRECTORY.reload_profile;
                    PHOTO_DIRECTORY.offer_login();
                    }
                },
            event: "contextmenu",
            submit: "OK",
            tooltip: "Right click to edit.",
            });
        $(".edit_textarea").editable("/ajax/save",
            {
            cancel: "Cancel",
            callback: function(data)
                {
                if (PHOTO_DIRECTORY.check_authentication(data))
                    {
                    PHOTO_DIRECTORY.reload_profile();
                    }
                else
                    {
                    PHOTO_DIRECTORY.last_function_called =
                      PHOTO_DIRECTORY.reload_profile;
                    PHOTO_DIRECTORY.offer_login();
                    }
                },
            rows: 5,
            submit: "OK",
            tooltip: "Click to edit.",
            type: "textarea",
            });
        }

    PHOTO_DIRECTORY.register_update = function()
        {
        PHOTO_DIRECTORY.limit_width("img.profile", 150);
        PHOTO_DIRECTORY.limit_width("img.search_results", 80);
        PHOTO_DIRECTORY.register_editables();
        PHOTO_DIRECTORY.register_autocomplete();
        if (!PHOTO_DIRECTORY.SHOULD_TURN_ON_HIJAXING)
            {
            $("a").removeAttr("onclick");
            // This link needs to be hijaxed:
            $("#add_new").click(function()
                {
                PHOTO_DIRECTORY.add_new();
                return false;
                });
            }
        if ($("#local_time_zone").html())
            {
            var date = new Date();
            var profile_offset = -parseFloat($("#local_time_zone").html()) *
              3600000;
            var january_offset = new Date(date.getFullYear(), 0, 1).getTimezoneOffset() * 60000;
            var our_offset = date.getTimezoneOffset() * 60000;
            if (our_offset != january_offset)
                {
                if (document.getElementById("observes_daylight_saving_time").checked)
                    {
                    profile_offset -= 3600000;
                    }
                }
            PHOTO_DIRECTORY.update_clock(our_offset - profile_offset,
              PHOTO_DIRECTORY.current_profile);
            }
        }

    PHOTO_DIRECTORY.reload_profile = function()
        {
        PHOTO_DIRECTORY.tables_loaded = 0;
        PHOTO_DIRECTORY.load_database();
        PHOTO_DIRECTORY.load_current_profile();
        }

    PHOTO_DIRECTORY.score = function(entity, keywords)
        {
        try
            {
            entity.fields.name;
            }
        catch(error)
            {
            return 0;
            }
        var result = 0;
        if (entity.fields.name)
            {
            result += PHOTO_DIRECTORY.count_tokens(entity.fields.name,
              keywords) * PHOTO_DIRECTORY.NAME_WEIGHT;
            }
        if (entity.fields.description)
            {
            result += PHOTO_DIRECTORY.count_tokens(entity.fields.description,
              keywords) * PHOTO_DIRECTORY.DESCRIPTION_WEIGHT;
            }
        for(var index = 0; index < entity.fields.tags.length; ++index)
            {
            if (PHOTO_DIRECTORY.Tags_by_id[entity.fields.tags[index]] ==
              keywords)
                {
                result += PHOTO_DIRECTORY.TAG_WEIGHT;
                }
            }
        if (entity.fields.title)
            {
            result += PHOTO_DIRECTORY.count_tokens( entity.fields.title,
              keywords) * PHOTO_DIRECTORY.TITLE_WEIGHT;
            }
        if (entity.fields.department)
            {
            result += PHOTO_DIRECTORY.count_tokens(
              PHOTO_DIRECTORY.Entities_by_id[
              entity.fields.department].fields.name, keywords) *
              PHOTO_DIRECTORY.DEPARTMENT_WEIGHT;
            }
        if (entity.fields["location"])
            {
            result += PHOTO_DIRECTORY.count_tokens(
              PHOTO_DIRECTORY.Entities_by_id[
              entity.fields["location"]].fields.name, keywords) *
              PHOTO_DIRECTORY.LOCATION_WEIGHT;
            }
        for (var index = 0; index < PHOTO_DIRECTORY.Stati.length; ++index)
            {
            if (PHOTO_DIRECTORY.Stati[index].fields.entity == entity.pk)
                {
                result += PHOTO_DIRECTORY.count_tokens(
                  PHOTO_DIRECTORY.Stati[index].  fields.text, keywords) *
                  PHOTO_DIRECTORY.STATUS_WEIGHT;
                }
            }
        return result;
        }

    PHOTO_DIRECTORY.search = function()
        {
        if (PHOTO_DIRECTORY.database_loaded)
            {
            var query = document.search_form.query.value;
            if (query.toLowerCase() == "all")
                {
                query = "";
                }
            var candidates = [];
            for(var index = 0; index < PHOTO_DIRECTORY.Entities.length;
              ++index)
                {
                candidates[candidates.length] =
                  [PHOTO_DIRECTORY.Entities[index], 0];
                }
            var tokens = PHOTO_DIRECTORY.get_tokens(query);
            for(var index = 0; index < tokens.length; ++index)
                {
                var new_candidates = [];
                for (var j = 0; j < candidates.length; ++j)
                    {
                    if (PHOTO_DIRECTORY.score(candidates[j][0],
                      tokens[index]) > 0)
                        {
                        candidates[j][1] +=
                          PHOTO_DIRECTORY.score(candidates[j][0],
                          tokens[index]);
                        new_candidates[new_candidates.length] = candidates[j];
                        }
                    }
                candidates = new_candidates;
                }
            var score_sorter = function(a, b)
                {
                if (a[1] > b[1])
                    {
                    return 1;
                    }
                if (a[1] == b[1])
                    {
                    return 0;
                    }
                if (a[1] < b[1])
                    {
                    return -1;
                    }
                }
            candidates.sort(score_sorter);
            var result = "<h2>Search results</h2>";
            if (candidates.length == 0)
                {
                result +=
                  "<p><em>There were no results for this search.</em></p>";
                }
            for(var index = 0; index < candidates.length; ++index)
                {
                if (index == PHOTO_DIRECTORY.INITIAL_RESULTS)
                    {
                    result += "<a class='show_additional_results' " +
                      "href='JavaScript:show_additional(\"results\")';>" +
                      "<span class='emphasized'>+</span> Show all</a>" +
                      "<div id='additional_results'>";
                    }
                result += "<div class='search_result' " +
                  "onmouseover='PHOTO_DIRECTORY.mouseover_profile(" +
                  candidates[index][0].pk + ");' " +
                  "onclick='PHOTO_DIRECTORY.click_profile(" +
                  candidates[index][0].pk + ");>";
                result += "<a href='/?query=" +
                  document.search_form.query.value +
                  "&id=" + candidates[index][0].pk +
                  "' onclick='PHOTO_DIRECTORY.load_profile(" +
                  candidates[index][0].pk + "); return false;'>" +
                  candidates[index][0].fields.name + "</a><br />";
                if (candidates[index][0].fields.image_mimetype)
                    {
                    result +=
                      "<img class='search_results' src='/profile/images/" + 
                      candidates[index][0].pk + "' />\n";
                    }
                if (candidates[index][0].fields.title)
                    {
                    result += candidates[index][0].fields.title;
                    if (candidates[index][0].department &&
                      PHOTO_DIRECTORY.Entities_by_id[candidates[index][0].
                      department].name)
                        {
                        result += ",<br />";
                        }
                    }
                if (candidates[index][0].department &&
                  PHOTO_DIRECTORY.Entities_by_id[candidates[index][0].
                  department].name)
                    {
                    result += PHOTO_DIRECTORY.Entities_by_id[candidates
                      [index][0].department].name;
                    }
                result += "</div>";
                }
            if (entity_stati.length > PHOTO_DIRECTORY.INITIAL_STATI)
                {
                result += "</div>";
                }
            if (result == "")
                {
                result =
                  "<p><em>There were no matches to your search.</em></p>";
                }
            $("#search_results").html(result);
            PHOTO_DIRECTORY.register_update();
            }
        else
            {
            $("#search_results").load("/ajax/search?query=" +
              escape(document.search_form.query.value),
              PHOTO_DIRECTORY.register_update);
            }
        }

    PHOTO_DIRECTORY.search_when_loaded = function()
        {
        if (PHOTO_DIRECTORY.database_loaded)
            {
            PHOTO_DIRECTORY.search();
            }
        else
            {
            setTimeout('PHOTO_DIRECTORY.search_when_loaded()',
              PHOTO_DIRECTORY.DELAY_BETWEEN_RETRIES);
            }
        }

    PHOTO_DIRECTORY.send_notification = function(message)
        {
        $("#notifications").html("<p>" + message + "</p>");
        setTimeout("$('#notifications').show('slow').delay(" + (5000 +
          message.length * 2) + ").hide('slow');", 0);
        }

    PHOTO_DIRECTORY.show_additional = function(name)
        {
        $(".show_additional_" + name).hide();
        $("#additional_" + name).show("slow");
        }

    PHOTO_DIRECTORY.show_element = function(name)
        {
        $("#hide_" + name).show();
        $("#show_" + name).hide();
        $("#" + name + "_visible").show();
        $("#" + name + "_hidden").hide();
        }

    PHOTO_DIRECTORY.undo = function(change_set)
        {
        $.ajax({
            data:
                {
                change_set: change_set
                },
            success: function()
                {
                PHOTO_DIRECTORY.undo_notification(
                  "The change has been undone.");
                PHOTO_DIRECTORY.reload_profile();
                },
            url: "/ajax/undo",
          });
        }

    PHOTO_DIRECTORY.undo_notification = function(text)
        {
        if ($("div.undo_notifications").html().match(/\S/))
            {
            $("div.undo_notifications").fadeOut("slow").html(text +
              " &nbsp; <a href='JavaScript:PHOTO_DIRECTORY.dismiss_undo()" +
              "' class='dismiss_undo'>&#10008;</a>"
              ).fadeIn("slow");
            }
        else
            {
            $("div.undo_notifications").html(text +
              " &nbsp; <a href='JavaScript:PHOTO_DIRECTORY.dismiss_undo()" +
              "' class='dismiss_undo'>&#10008;</a>").show("slow");
            }
        }

    PHOTO_DIRECTORY.update_autocomplete_handler = function(event, ui)
        {
        var split_value = ui.item.option.value.split(".");
        var field = split_value[0];
        var id = split_value[1];
        $.ajax({
            data:
                {
                id: "Entity_" + field + "_" + PHOTO_DIRECTORY.current_profile,
                value: ui.item.option.value,
                },
            url: "/ajax/save", 
            });
        PHOTO_DIRECTORY.reload_profile();
        }

    PHOTO_DIRECTORY.update_autocomplete = function(id, html_id)
        {
        var value = $("#" + html_id).val();
        $.ajax({
            data:
                {
                id: id,
                value: value,
                },
            url: "/ajax/save", 
            });
        PHOTO_DIRECTORY.reload_profile();
        PHOTO_DIRECTORY.register_update();
        }
    
    PHOTO_DIRECTORY.update_clock = function(offset, id)
        {
        if (id != PHOTO_DIRECTORY.current_profile)
            {
            return;
            }
        var adjusted_date = new Date(new Date().getTime() + offset);
        var days = ["Sunday", "Monday", "Tuesday", "Wednesday",
          "Thursday", "Friday", "Saturday"];
        var months = ["January", "February", "March", "April",
          "May", "June", "July", "August", "September", "November",
          "December"];
        var ampm = "AM";
        var hours = adjusted_date.getHours()
        if (hours > 11)
            {
            hours -= 12;
            ampm = "PM"
            }
        if (hours == 0)
            {
            hours = 12;
            }
        var formatted_date = "<strong>" + hours + ":";
        if (adjusted_date.getMinutes() < 10)
            {
            formatted_date += "0";
            }
        formatted_date += adjusted_date.getMinutes() + " " + ampm;
        formatted_date += "</strong>, ";
        formatted_date += days[adjusted_date.getDay()] + " ";
        formatted_date += months[adjusted_date.getMonth()] + " ";
        formatted_date += adjusted_date.getDate() + ", ";
        formatted_date += adjusted_date.getFullYear();
        $("#local_time").html(formatted_date + ".");
        setTimeout("PHOTO_DIRECTORY.update_clock(" + offset + ", " + id +
          ")", 1000);
        }

    $(function()
        {
        if (PHOTO_DIRECTORY.SHOULD_TURN_ON_HIJAXING)
            {
            $("#search_form").submit(function(event)
                {
                PHOTO_DIRECTORY.search();
                return false;
                });
            }
        $("#query").width($(window).width() - 240);
        $("#create_account").dialog({
            autoOpen: false,
            height: 350,
            width: 350,
            modal: true,
            buttons:
                {
                "Create": function()
                    {
                    $.ajax({
                        data:
                            {
                            "new_email": document.getElementById("new_email").value,
                            "new_password": document.getElementById("new_password").value,
                            "new_username": document.getElementById("new_username").value,
                            },
                        url: "/ajax/create_user",
                        });
                    $("#create_account").dialog("close");
                    }
                },
            });
        $("#login_form").dialog({
            autoOpen: false,
            height: 490,
            width: 350,
            modal: true,
            buttons:
                {
                'Log in': function()
                    {
                    $.ajax({
                        data:
                            {
                            "login": document.getElementById("login").value,
                            "password":
                              document.getElementById("password_visible").value,
                            },
                        datatype: 'text',
                        success: function(data, textStatus, XMLHttpRequest)
                            {
                            if (data)
                                {
                                PHOTO_DIRECTORY.send_notification(
                                  "You have successfully logged in and " +
                                  "can now make changes.");
                                PHOTO_DIRECTORY.load_database();
                                
                                $("#login_form").dialog("close");
                                PHOTO_DIRECTORY.register_update();
                                if (PHOTO_DIRECTORY.last_attempted_function)
                                    {
                                    PHOTO_DIRECTORY.last_attempted_function();
                                    }
                                }
                            else
                                {
                                PHOTO_DIRECTORY.send_notification(
                                  "Your login was not successful.");
                                }
                            },
                        url: "/ajax/login",
                        close: function(){},
                        });
                    },
                'Forgot password': function()
                    {
                    document.location = "/password_reset/";
                    },
                {% if settings.SHOULD_ALLOW_USERS_TO_CREATE_ACCOUNTS %}
                'Create account': function()
                    {
                    $("#login_form").dialog("close");
                    $("#create_account").dialog("open");
                    },
                {% endif %}
                'Cancel and go back': function()
                    {
                    $("#login_form").dialog("close");
                    PHOTO_DIRECTORY.reload_profile();
                    }
                },
            });
        PHOTO_DIRECTORY.check_login();
        PHOTO_DIRECTORY.load_database();
        PHOTO_DIRECTORY.register_update();
        });

    
    });
