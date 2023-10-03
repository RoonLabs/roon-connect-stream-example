import RoonApi           from "node-roon-api";
import RoonApiSettings   from 'node-roon-api-settings';
import RoonApiTransport  from 'node-roon-api-transport';
import RoonApiStatus     from 'node-roon-api-status';
import RoonApiAudioInput from 'node-roon-api-audioinput';

const _v = { };
let _log = (msg) => {};
let _settings = {};

let svc_status;

function _updateSettings() {
    if (!_v.core) {
        _doevent("ready_to_pair");
        return;
    }

    if (!_v.zones) {
        _doevent("initializing");
        return;
    }

    // convert output_id to zone_id
    let zid = _settings.output?.output_id;
    _v.current_output_id = zid;

    if (_v.zones) {
        b: for (let z in _v.zones) {
            const zone = _v.zones[z];
            if (zone.outputs) {
                for (let o of zone.outputs) {
                    if (o.output_id == zid) {
                        zid = z;
                        break b;
                    }
                }
            }
        }
    }

    if (!_v.zones || !_v.zones[zid]) {
        _v.current_zone_id = undefined;
        _v.current_output_id = undefined;
        _v.current_zone = undefined;
        _doevent("no_zone");
        return;

    } else if (_v.current_zone_id != zid) {
        stop();
        _v.current_zone_id = zid;
        _v.current_zone = _v.zones[_v.current_zone_id];
    }
}

function _doevent(ev) {
    if (ev == "ready_to_pair") {
        svc_status.set_status("Ready to pair", true);
    } else if (ev == "initializing") {
        svc_status.set_status("Intializing...", false);
    } else if (ev == "preparing") {
        svc_status.set_status("Preparing...", false);
    } else if (ev == "stopped") {
        svc_status.set_status("Ready", false);
    } else if (ev == "playing") {
        svc_status.set_status("Playing...", false);
    } else if (ev == "no_zone") {
        svc_status.set_status("Please configure zone", true);
    }
}

export function init({
                     logger,
                     enableProtocolTrace,
                     extensionOptions
                    })
{
    if (logger) _log = logger;

    _v.roon = new RoonApi({
        ...extensionOptions,

        log_level: enableProtocolTrace ? "all" : "none",

        force_server: true,

        core_paired: function(_core) {
            _log("Paired");
            _v.core = _core;
            _v.current_zone_id = _v.roon.load_config("current_zone_id");
            _v.current_output_id = _v.roon.load_config("current_zone_id");
            _core.services.RoonApiTransport.subscribe_zones((response, msg) => {
                if (response == "Subscribed") {
                    _v.zones = {};
                    msg.zones.forEach(e => {
                        _v.zones[e.zone_id] = e;
                    });
                    _doevent("stopped");
                    _updateSettings();

                } else if (response == "Changed") {
                    if (msg.zones_removed) msg.zones_removed.forEach(e => delete(_v.zones[e.zone_id]));
                    if (msg.zones_added)   msg.zones_added  .forEach(e => { _v.zones[e.zone_id] = e; });
                    _updateSettings();
                }
            });
            _updateSettings();
        },
        core_unpaired: function(_core) {
            _log("Pairing removed");
            _updateSettings();
            delete(_v.core = null);
            delete(_v.zones);
        }
    });

    _settings = _v.roon.load_config("settings") || {
        output: undefined,
    };

    function makelayout(settings) {
        return {
            values: settings,
            layout: [
                {
                    type:    "zone",
                    title:   "Zone",
                    setting: "output",
                }
            ],
            has_error: false
        };
    }

    const svc_settings = new RoonApiSettings(_v.roon, {
        get_settings: function(cb) {
            cb(makelayout(_settings));
        },
        save_settings: function(req, isdryrun, settings) {
            let l = makelayout(settings.values);
            req.send_complete(l.has_error ? "NotValid" : "Success", { settings: l });

            if (!l.has_error) {
                _settings = l.values;
                _updateSettings();
                _v.roon.save_config("settings", _settings);
            }
        }
    });

    svc_status = new RoonApiStatus(_v.roon);

    _v.roon.init_services({
        provided_services: [ svc_settings, svc_status ],
        required_services: [ RoonApiAudioInput, RoonApiTransport ],
    });
    _v.roon.start_discovery();
    _updateSettings();

    return _v;
}


export function play({
                        url,
                        name,
                        line1,
                        icon
                     })
{
    if (!_v.core) {
        _log("ERROR: Your Roon are not paired to this extension");
        return;
    }
    if (!_v.current_zone) {
        _log("ERROR: Your zone is not selected. Please visit Roon > Settings > Extensions and configure this extension.");
        return;
    }

    _doevent("preparing");

    _v.session = _v.core.services.RoonApiAudioInput.begin_session({
            zone_id: _v.current_zone.zone_id,
            display_name: name,
            icon_url: icon,
        },
        async (msg, body) => {
            if (msg == "SessionBegan") {
                _v.core.services.RoonApiAudioInput.update_transport_controls({
                                                                                session_id: body.session_id,
                                                                                controls: {
                                                                                    is_previous_allowed: false,
                                                                                    is_next_allowed: false,
                                                                                },
                                                                                },
                                                                                (msg, body) => { });
                _v.core.services.RoonApiAudioInput.play({
                                                            session_id: body.session_id,
                                                            type: "channel",
                                                            slot: "play",
                                                            media_url: url,
                                                            info: {
                                                                is_seek_allowed: false,
                                                                is_pause_allowed: false,
                                                                one_line:   { line1 },
                                                                two_line:   { line1 },
                                                                three_line: { line1 },
                                                            }
                }, async (m,b) => {
                    if (m.name == "Playing") {
                        _doevent("playing");
                    } else if (m.name == 'Time') {
                        // nothing
                    } else if (m.name == 'StoppedUser') {
                        _doevent("stopped");
                    } else if (m.name == 'EndedNaturally' || m.name == 'MediaError') {
                        _doevent("stopped");
                    } else if (m.name == 'Paused') {
                        _doevent("stopped");
                    } else if (m.name == 'ZoneNotFound' || m.name == 'ZoneLost') {
                        _doevent("no_zone");
                    } else {
                        _log(`GOT unexpected msg from play: ${JSON.stringify(m)} / ${JSON.stringify(b)}`);
                    }
                });
            } else if (msg == "ZoneNotFound" || msg == "ZoneLost") {
                _doevent("no_zone");

            } else if (msg == "SessionEnded") {
                _doevent("stopped");
            }
        }
    );
}

export function stop() {
    if (_v.session) {
        _v.session.end_session((msg, body) => { });
        delete(_v.session);
    } else {
        _doevent("stopped");
    }
}
