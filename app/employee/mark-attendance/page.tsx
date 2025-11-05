"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../../../lib/auth";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Clock8 } from "lucide-react";
import { useAttendanceToday, useCheckIn, useCheckOut } from "@/lib/firebase/hooks/useAttendance";

export default function EmployeeMarkAttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Get user from localStorage
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setLoading(false);
  }, []);
  
  const userId = currentUser?.email; // Use email as unique identifier
  const { data, checkedIn, loading: attendanceLoading } = useAttendanceToday(userId);
  const { mutate: doCheckIn, loading: checkInLoading, error: checkInError } = useCheckIn();
  const { mutate: doCheckOut, loading: checkOutLoading, error: checkOutError } = useCheckOut();
  const [timestamp, setTimestamp] = useState<string>("");
  const [runningHours, setRunningHours] = useState<string>("");
  const [nowStr, setNowStr] = useState<string>("");
  const [gpsOk, setGpsOk] = useState<boolean>(false);
  const [gpsCoords, setGpsCoords] = useState<{ latitude: number; longitude: number } | undefined>(undefined);

  useEffect(() => {
    // Check localStorage auth - redirect if not authenticated or not an employee
    if (!loading) {
      if (!currentUser || currentUser.role !== "employee") {
        router.replace("/login");
      }
    }
  }, [loading, currentUser, router]);

  // GPS capture
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsOk(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsOk(true);
        setGpsCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {
        setGpsOk(false);
        setGpsCoords(undefined);
      },
      { enableHighAccuracy: true, timeout: 3000 }
    );
  }, []);

  // Client-only clock to avoid hydration mismatch
  useEffect(() => {
    const tick = () => setNowStr(new Date().toLocaleTimeString());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Update timestamp based on last action from Firestore
  useEffect(() => {
    if (data?.checkOut) {
      setTimestamp(data.checkOut.timestamp.toDate().toLocaleString());
    } else if (data?.checkIn) {
      setTimestamp(data.checkIn.timestamp.toDate().toLocaleString());
    } else {
      setTimestamp("");
    }
  }, [data?.checkIn, data?.checkOut]);

  // Live timer - updates every second when checked in
  useEffect(() => {
    if (!checkedIn || !data?.checkIn?.timestamp) {
      setRunningHours("");
      return;
    }
    const calc = () => {
      try {
        const inMs = data.checkIn!.timestamp.toMillis();
        const nowMs = Date.now();
        const hours = (nowMs - inMs) / (1000 * 60 * 60);
        setRunningHours(hours.toFixed(2));
      } catch {
        setRunningHours("");
      }
    };
    calc(); // Calculate immediately
    const id = setInterval(calc, 1000); // Update every second
    return () => clearInterval(id);
  }, [checkedIn, data?.checkIn?.timestamp]);

  const displayTotal = (() => {
    if (data?.checkOut && data?.checkIn) {
      if (typeof data.totalHours === "number") return data.totalHours.toFixed(2);
      try {
        const inMs = data.checkIn.timestamp.toMillis();
        const outMs = data.checkOut.timestamp.toMillis();
        const hours = (outMs - inMs) / (1000 * 60 * 60);
        return Math.max(0, Number(hours.toFixed(2))).toFixed(2);
      } catch {
        return "";
      }
    }
    if (checkedIn && runningHours) return runningHours;
    return "";
  })();

  async function handleCheck() {
    console.log("handleCheck called");
    
    // Use userId from localStorage
    const idToUse = userId;
    
    console.log("ID to use:", idToUse);
    console.log("checkedIn:", checkedIn);
    console.log("data:", data);
    
    if (!idToUse) {
      console.error("No user ID available");
      return;
    }
    
    try {
      console.log("Attempting check-in/out...");
      if (!checkedIn) {
        console.log("Calling doCheckIn with:", idToUse, gpsCoords);
        await doCheckIn(idToUse, gpsCoords);
      } else {
        console.log("Calling doCheckOut with:", idToUse, gpsCoords);
        await doCheckOut(idToUse, gpsCoords);
      }
      console.log("Check-in/out completed successfully");
    } catch (error) {
      console.error("Check-in/out error:", error);
      // Error will be displayed via checkInError or checkOutError
    }
  }
  
  // Button text - updates in real-time based on Firestore listener
  const buttonText = checkInLoading || checkOutLoading 
    ? "Processing..." 
    : checkedIn 
      ? "Check-Out" 
      : "Check-In";

  // Debug disabled conditions - allow button if userId exists and user is authenticated
  const isDisabled = loading || !userId || !currentUser || attendanceLoading || checkInLoading || checkOutLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Mark Attendance</h1>
        <p className="text-sm text-slate-600">Check-In / Check-Out with current time and GPS capture indicator.</p>
      </div>

      <Card>
        <CardHeader title="Check In / Check Out" />
        <CardContent>
          <div className="space-y-4">
            {/* Enhanced Check-in Widget */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Check In / Check Out</h3>
                  <p className="text-xs text-slate-500">Current time: <span suppressHydrationWarning>{nowStr || "—"}</span></p>
                </div>
                {checkedIn && runningHours && (
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Working</div>
                    <div className="text-lg font-semibold text-blue-600">{runningHours}h</div>
                  </div>
                )}
              </div>
              
              {data?.checkIn && (
                <div className="text-xs text-slate-600">
                  Checked in: {data.checkIn.timestamp.toDate().toLocaleTimeString()}
                </div>
              )}
              {data?.checkOut && (
                <div className="text-xs text-slate-600">
                  Checked out: {data.checkOut.timestamp.toDate().toLocaleTimeString()}
                  {displayTotal && <span className="ml-2">• Total: {displayTotal}h</span>}
                </div>
              )}
              
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm w-fit">
                <MapPin size={14} className={gpsOk ? "text-green-600" : "text-amber-600"} />
                GPS {gpsOk ? "Captured" : "Not Available"}
              </div>
              
              {(checkInError || checkOutError) && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
                  {(checkInError || checkOutError)?.message || "An error occurred. Please try again."}
                </div>
              )}
              
              <Button
                className="w-full"
                onClick={(e) => {
                  e.preventDefault();
                  console.log("Button clicked, disabled:", isDisabled);
                  if (!isDisabled) {
                    handleCheck();
                  }
                }}
                disabled={isDisabled}
                type="button"
              >
                <Clock8 className="mr-2" size={16} />
                {buttonText}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


