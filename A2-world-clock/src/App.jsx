import { useEffect, useState } from "react";
import "./App.css";

const TIME_ZONES = [
  { city: "Pune", country: "India", zone: "Asia/Kolkata", flag: "🇮🇳" },
  { city: "London", country: "United Kingdom", zone: "Europe/London", flag: "🇬🇧" },
  { city: "New York", country: "United States", zone: "America/New_York", flag: "🇺🇸" },
  { city: "Tokyo", country: "Japan", zone: "Asia/Tokyo", flag: "🇯🇵" },
  { city: "Dubai", country: "UAE", zone: "Asia/Dubai", flag: "🇦🇪" },
  { city: "Sydney", country: "Australia", zone: "Australia/Sydney", flag: "🇦🇺" },
];

function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeFormat, setTimeFormat] = useState("24");
  const [darkMode, setDarkMode] = useState(true);
  const [selectedZones, setSelectedZones] = useState(TIME_ZONES.slice(0, 4));
  const [alarms, setAlarms] = useState([]);
  const [alarmTime, setAlarmTime] = useState("");
  const [alarmLabel, setAlarmLabel] = useState("");
  const [activeAlarm, setActiveAlarm] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const current = currentTime.toTimeString().slice(0, 5);
    const alarm = alarms.find((item) => item.time === current && !item.triggered);
    if (alarm) {
      setActiveAlarm(alarm);
      setAlarms((previous) =>
        previous.map((item) =>
          item.id === alarm.id ? { ...item, triggered: true } : item
        )
      );
    }
  }, [currentTime, alarms]);

  const formatTime = (date, zone) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: timeFormat === "12",
    }).format(date);

  const formatDate = (date, zone) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);

  const getHMS = (date, zone) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const result = {};
    parts.forEach((part) => {
      if (["hour", "minute", "second"].includes(part.type)) result[part.type] = Number(part.value);
    });
    return result;
  };

  const getOffset = (zone) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      timeZoneName: "longOffset",
    }).formatToParts(currentTime);
    const value = parts.find((part) => part.type === "timeZoneName");
    return value ? value.value.replace("GMT", "UTC") : "";
  };

  const addTimeZone = (zoneName) => {
    const zone = TIME_ZONES.find((item) => item.zone === zoneName);
    if (zone && !selectedZones.some((item) => item.zone === zone.zone)) {
      setSelectedZones((prev) => [...prev, zone]);
    }
  };

  const removeTimeZone = (zoneName) =>
    setSelectedZones((prev) => prev.filter((item) => item.zone !== zoneName));

  const addAlarm = () => {
    if (!alarmTime) return;
    setAlarms((prev) => [
      ...prev,
      {
        id: Date.now(),
        time: alarmTime,
        label: alarmLabel || "Alarm",
        triggered: false,
      },
    ]);
    setAlarmTime("");
    setAlarmLabel("");
  };

  const localTime = getHMS(currentTime, "Asia/Kolkata");
  const hourDegree = (localTime.hour % 12) * 30 + localTime.minute * 0.5;
  const minuteDegree = localTime.minute * 6 + localTime.second * 0.1;
  const secondDegree = localTime.second * 6;

  return (
    <div className={`app ${darkMode ? "dark" : "light"}`}>
      <header className="header">
        <div>
          <h1>Chronos</h1>
          <p>Real-Time World Clock Dashboard</p>
        </div>
        <div className="header-controls">
          <button onClick={() => setTimeFormat(timeFormat === "24" ? "12" : "24")}>
            {timeFormat === "24" ? "12-Hour" : "24-Hour"}
          </button>
          <button onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </header>

      <section className="main-clock-section">
        <div className="clock-wrapper">
          <div className="analog-clock">
            {[...Array(12)].map((_, index) => (
              <div key={index} className="clock-number" style={{ transform: `rotate(${index * 30}deg)` }}>
                <span style={{ transform: `rotate(-${index * 30}deg)` }}>
                  {index === 0 ? 12 : index}
                </span>
              </div>
            ))}
            <div className="hand hour-hand" style={{ transform: `rotate(${hourDegree}deg)` }} />
            <div className="hand minute-hand" style={{ transform: `rotate(${minuteDegree}deg)` }} />
            <div className="hand second-hand" style={{ transform: `rotate(${secondDegree}deg)` }} />
            <div className="clock-center" />
          </div>
        </div>

        <div className="digital-area">
          <div className="live-badge"><span /> LIVE</div>
          <h2>{formatTime(currentTime, "Asia/Kolkata")}</h2>
          <p>{formatDate(currentTime, "Asia/Kolkata")}</p>
          <div className="location">🇮🇳 Pune, India</div>
          <div className="timezone-offset">{getOffset("Asia/Kolkata")}</div>
        </div>
      </section>

      <section>
        <div className="section-title">
          <div>
            <h2>World Clocks</h2>
            <p>Live time across selected regions</p>
          </div>
          <select defaultValue="" onChange={(e) => { addTimeZone(e.target.value); e.target.value = ""; }}>
            <option value="">+ Add Time Zone</option>
            {TIME_ZONES.map((zone) => (
              <option key={zone.zone} value={zone.zone}>{zone.city}, {zone.country}</option>
            ))}
          </select>
        </div>

        <div className="world-grid">
          {selectedZones.map((zone) => {
            const time = getHMS(currentTime, zone.zone);
            return (
              <div className="world-card" key={zone.zone}>
                <button className="remove" onClick={() => removeTimeZone(zone.zone)}>×</button>
                <div className="world-top">
                  <span className="flag">{zone.flag}</span>
                  <div><h3>{zone.city}</h3><p>{zone.country}</p></div>
                </div>
                <div className="world-time">{formatTime(currentTime, zone.zone)}</div>
                <div className="world-date">{formatDate(currentTime, zone.zone)}</div>
                <div className="offset">{getOffset(zone.zone)}</div>
                <div className="progress"><div style={{ width: `${(time.second / 60) * 100}%` }} /></div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-title">
          <div><h2>Alarm Center</h2><p>Schedule and manage alarms</p></div>
        </div>

        <div className="alarm-layout">
          <div className="alarm-form">
            <label htmlFor="alarmTime">Alarm Time</label>
            <input id="alarmTime" type="time" value={alarmTime} onChange={(e) => setAlarmTime(e.target.value)} />
            <label htmlFor="alarmLabel">Label</label>
            <input id="alarmLabel" type="text" placeholder="Morning alarm" value={alarmLabel} onChange={(e) => setAlarmLabel(e.target.value)} />
            <button className="add-alarm" onClick={addAlarm}>+ Set Alarm</button>
          </div>

          <div className="alarm-list">
            {alarms.length === 0 ? (
              <div className="empty">No alarms scheduled</div>
            ) : (
              alarms.map((alarm) => (
                <div className="alarm-item" key={alarm.id}>
                  <div><strong>{alarm.time}</strong><span>{alarm.label}</span></div>
                  <button onClick={() => setAlarms((prev) => prev.filter((item) => item.id !== alarm.id))}>Delete</button>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="stats">
        <div className="stat"><span>🌎</span><div><small>Time Zones</small><strong>{selectedZones.length}</strong></div></div>
        <div className="stat"><span>🔔</span><div><small>Active Alarms</small><strong>{alarms.length}</strong></div></div>
        <div className="stat"><span>⚡</span><div><small>Status</small><strong>Live</strong></div></div>
      </section>

      {activeAlarm && (
        <div className="alarm-overlay">
          <div className="alarm-popup">
            <div className="alarm-icon">🔔</div>
            <h2>Alarm!</h2>
            <p>{activeAlarm.label}</p>
            <strong>{activeAlarm.time}</strong>
            <button onClick={() => setActiveAlarm(null)}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
