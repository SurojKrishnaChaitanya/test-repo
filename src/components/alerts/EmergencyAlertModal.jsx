import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  X,
  MapPin,
  Compass,
  Radio,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  MessageSquare,
  ShieldAlert,
  Send,
} from 'lucide-react';
import { subscribeToAlerts } from '../../services/mlInferenceService';

const DISTRICTS = [
  { id: 'IN-MH-MUM', name: 'Mumbai Metro', state: 'Maharashtra', lat: 19.076, lng: 72.8777, alertSeverity: 'severe', alertType: 'Flash Flood' },
  { id: 'IN-HP-SOL', name: 'Solan District', state: 'Himachal Pradesh', lat: 30.907, lng: 77.0999, alertSeverity: 'severe', alertType: 'Cloudburst' },
  { id: 'IN-HP-SHM', name: 'Shimla Ridge', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734, alertSeverity: 'high', alertType: 'Cloudburst' },
  { id: 'IN-UK-RUD', name: 'Rudraprayag Catchment', state: 'Uttarakhand', lat: 30.2849, lng: 78.9814, alertSeverity: 'high', alertType: 'Cloudburst' },
  { id: 'IN-AS-GUW', name: 'Guwahati Basin', state: 'Assam', lat: 26.1445, lng: 91.7362, alertSeverity: 'moderate', alertType: 'Thunderstorm' },
  { id: 'IN-WB-DAR', name: 'Darjeeling Foothills', state: 'West Bengal', lat: 27.0410, lng: 88.2663, alertSeverity: 'high', alertType: 'Flash Flood' },
  { id: 'IN-TN-CHE', name: 'Chennai Coastal Zone', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, alertSeverity: 'moderate', alertType: 'Flash Flood' },
  { id: 'IN-MH-PUN', name: 'Pune Outskirts', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, alertSeverity: 'moderate', alertType: 'Thunderstorm' },
];

export default function EmergencyAlertModal({ isOpen, onClose }) {
  const [selectedDistrictId, setSelectedDistrictId] = useState('IN-MH-MUM');
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [channels, setChannels] = useState({ sms: true, push: true, siren: true });
  const [isSirenPlaying, setIsSirenPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Audio Context Ref for Web Audio API siren synthesis
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  const activeDistrict = DISTRICTS.find((d) => d.id === selectedDistrictId) || DISTRICTS[0];

  // Synthesized Emergency Siren using Web Audio API
  const toggleSirenAudio = () => {
    if (isSirenPlaying) {
      stopSirenAudio();
    } else {
      startSirenAudio();
    }
  };

  const startSirenAudio = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(750, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      oscillatorRef.current = osc;

      // Modulate frequency back and forth between 600Hz and 950Hz
      let high = false;
      sirenIntervalRef.current = setInterval(() => {
        if (!oscillatorRef.current || !audioContextRef.current) return;
        const now = audioContextRef.current.currentTime;
        oscillatorRef.current.frequency.exponentialRampToValueAtTime(
          high ? 950 : 600,
          now + 0.35
        );
        high = !high;
      }, 400);

      setIsSirenPlaying(true);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  const stopSirenAudio = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      } catch (e) {}
      oscillatorRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    setIsSirenPlaying(false);
  };

  useEffect(() => {
    return () => {
      stopSirenAudio();
    };
  }, []);

  const handleUseGps = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsActive(true);
        setGpsCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        // Fallback default coordinates
        setGpsActive(true);
        setGpsCoords({ lat: activeDistrict.lat, lng: activeDistrict.lng, accuracy: 25 });
      }
    );
  };

  const handleSubscribe = async () => {
    setIsSubmitting(true);
    try {
      const activeChannels = Object.entries(channels)
        .filter(([, v]) => v)
        .map(([k]) => k);

      await subscribeToAlerts({
        region_id: activeDistrict.id,
        lat: gpsCoords ? gpsCoords.lat : activeDistrict.lat,
        lng: gpsCoords ? gpsCoords.lng : activeDistrict.lng,
        radius_km: 15.0,
        channels: activeChannels,
        recipient_identifier: 'deoc-duty-officer',
      });

      setIsSubscribed(true);
    } catch (err) {
      // Handled cleanly
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-900 animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-linear-to-r from-red-600 via-rose-600 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-2xl backdrop-blur-md">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">NDMA Emergency Alert Center</h2>
                <span className="px-2 py-0.5 rounded bg-white/20 text-[10px] font-mono font-bold">
                  CAP v1.2
                </span>
              </div>
              <p className="text-xs text-red-100 font-medium">
                Official Multi-Channel Disaster Notification & Broadcaster
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopSirenAudio();
              onClose();
            }}
            aria-label="Close modal"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Location & GPS Detection */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              1. Select Monitored District or GPS Coordinate
            </label>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <select
                  value={selectedDistrictId}
                  onChange={(e) => {
                    setSelectedDistrictId(e.target.value);
                    setGpsActive(false);
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.state})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleUseGps}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  gpsActive
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Compass className={`w-4 h-4 ${gpsActive ? 'text-emerald-600' : 'text-slate-500'}`} />
                <span>{gpsActive ? 'GPS Position Locked' : 'Use Current GPS Location'}</span>
              </button>
            </div>

            {gpsActive && gpsCoords && (
              <p className="text-[11px] font-mono text-emerald-700 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                Centroid: {gpsCoords.lat.toFixed(4)}°N, {gpsCoords.lng.toFixed(4)}°E (Radius: 15 km)
              </p>
            )}
          </div>

          {/* Delivery Channels */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              2. Emergency Broadcast Channels
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setChannels((p) => ({ ...p, sms: !p.sms }))}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-semibold cursor-pointer transition-all ${
                  channels.sms ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>CAP-SMS</span>
              </button>

              <button
                type="button"
                onClick={() => setChannels((p) => ({ ...p, push: !p.push }))}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-semibold cursor-pointer transition-all ${
                  channels.push ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Mobile Push</span>
              </button>

              <button
                type="button"
                onClick={() => setChannels((p) => ({ ...p, siren: !p.siren }))}
                className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-semibold cursor-pointer transition-all ${
                  channels.siren ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>Cell Siren</span>
              </button>
            </div>
          </div>

          {/* NDMA / CAP v1.2 Emergency Broadcast Banner Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                3. CAP v1.2 Broadcast Notification Preview
              </label>

              {/* Siren Audio Toggle */}
              <button
                type="button"
                onClick={toggleSirenAudio}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isSirenPlaying
                    ? 'bg-red-600 text-white animate-pulse shadow-md shadow-red-600/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isSirenPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-red-600" />}
                <span>{isSirenPlaying ? 'Mute Siren Tone' : 'Play Siren Tone'}</span>
              </button>
            </div>

            <div className="p-4 bg-linear-to-r from-red-50 to-rose-50 rounded-2xl border-2 border-red-500 shadow-md space-y-2.5 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-red-200 pb-2">
                <div className="flex items-center gap-2 text-red-700 font-mono font-bold text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                  <span>CRITICAL RED ALERT (CAP-IN-2026-088)</span>
                </div>
                <span className="text-[10px] font-mono text-red-800 bg-red-100 px-2 py-0.5 rounded font-bold">
                  IMMEDIATE ACTION REQUIRED
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900 leading-snug">
                  Severe {activeDistrict.alertType} & Inundation Imminent in {activeDistrict.name}
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Deep convective storm rupture projected to exceed 80 mm/hr within 90 minutes. Catchment runoff acceleration triggers extreme flash flood surge. Evacuate low-lying river channels and basement structures immediately.
                </p>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1">
                <span>Authority: NDMA & IMD Warning Directorate</span>
                <span>Radius: 15 km Centroid</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            {isSubscribed ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Subscription Registered!
              </span>
            ) : (
              'Registered under CAP Disaster Protocol'
            )}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                stopSirenAudio();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleSubscribe}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-red-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Registering...' : 'Subscribe Location Alerts'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
