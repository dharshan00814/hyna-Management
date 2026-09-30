import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, 
  MonitorUp, MessageSquare, Users, Settings, 
  UserPlus
} from 'lucide-react';
import { Button, Avatar } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { toast } from 'sonner';

// Sample data for UI layout before full signaling integration
const SAMPLE_PARTICIPANTS = [
  { id: '1', name: 'John Doe', avatar: 'JD', isMuted: false, hasVideo: true },
  { id: '2', name: 'Jane Smith', avatar: 'JS', isMuted: true, hasVideo: false },
];

export function MeetingRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, effectiveRole } = useAuthStore();
  const rolePrefix = effectiveRole === 'admin' ? '/admin' : effectiveRole === 'manager' ? '/manager' : '/member';
  
  const [isJoined, setIsJoined] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    // Attempt to get user media
    async function setupMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Failed to get local media", err);
        toast.error("Camera/Microphone permission denied or unavailable.");
      }
    }
    setupMedia();
    
    return () => {
      // cleanup media
      if (localVideoRef.current?.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  const handleLeave = () => {
    navigate(`${rolePrefix}/meetings`);
  };

  return (
    <div className="h-screen w-full bg-[#0a0a0c] flex flex-col overflow-hidden text-white font-sans">
      {/* Header */}
      <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#0f1015]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="font-semibold text-lg">Meeting: {id}</span>
          </div>
          <span className="text-gray-400 bg-gray-800 px-3 py-1 rounded-md text-sm font-mono">00:15:32</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center text-green-400 gap-1.5 text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Connected
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">4</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Video Grid */}
        <div className="flex-1 p-4 grid grid-cols-2 gap-4 auto-rows-[1fr]">
          {/* Local User */}
          <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-gray-800 group">
            <video 
              ref={localVideoRef}
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-sm">
              <span className="text-sm font-medium">You</span>
              {!micEnabled && <MicOff className="w-3.5 h-3.5 text-red-400" />}
            </div>
          </div>
          
          {/* Remote User Placeholder */}
          <div className="relative bg-gray-900 rounded-xl overflow-hidden border border-[#2F3EFF] shadow-[0_0_15px_rgba(47,62,255,0.2)]">
            <div className="w-full h-full flex flex-col items-center justify-center">
              <Avatar name="Sarah Walker" size="xl" />
              <p className="mt-4 text-gray-400 text-sm">Camera is off</p>
            </div>
            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-sm">
              <span className="text-sm font-medium">Sarah Walker (Active Speaker)</span>
            </div>
          </div>
        </div>

        {/* Side Panel (Chat / Participants) */}
        {(showChat || showParticipants) && (
          <div className="w-80 border-l border-gray-800 bg-[#0f1015] flex flex-col">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="font-semibold">{showChat ? 'Meeting Chat' : 'Participants'}</h3>
              <Button variant="ghost" size="sm" onClick={() => { setShowChat(false); setShowParticipants(false); }}>Close</Button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {showParticipants ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name="You" size="sm" />
                      <span className="text-sm">You</span>
                    </div>
                    <div className="flex gap-2 text-gray-400">
                      {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-red-400" />}
                      {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>
                  {SAMPLE_PARTICIPANTS.map(p => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} size="sm" />
                        <span className="text-sm">{p.name}</span>
                      </div>
                      <div className="flex gap-2 text-gray-400">
                        {p.isMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
                        {!p.hasVideo ? <VideoOff className="w-4 h-4 text-red-400" /> : <Video className="w-4 h-4" />}
                      </div>
                    </div>
                  ))}
                  <Button className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white" variant="outline">
                    <UserPlus className="w-4 h-4 mr-2" /> Invite People
                  </Button>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex-1 flex flex-col justify-end gap-3 pb-4">
                    <div className="bg-gray-800 rounded-lg p-3 text-sm">
                      <p className="text-xs text-gray-400 mb-1">Sarah Walker • 10:05 AM</p>
                      <p>Hello everyone, let's start the design review.</p>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <input type="text" placeholder="Type a message..." className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#2F3EFF]" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Controls */}
      <footer className="h-20 bg-[#0f1015] border-t border-gray-800 flex items-center justify-center gap-4 px-6 relative">
        <Button 
          onClick={() => setMicEnabled(!micEnabled)} 
          className={`h-12 w-12 rounded-full flex items-center justify-center ${micEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'} border-none`}
        >
          {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        <Button 
          onClick={() => setVideoEnabled(!videoEnabled)} 
          className={`h-12 w-12 rounded-full flex items-center justify-center ${videoEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'} border-none`}
        >
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        <Button 
          onClick={() => setScreenSharing(!screenSharing)} 
          className={`h-12 w-12 rounded-full flex items-center justify-center ${screenSharing ? 'bg-[#2F3EFF] hover:bg-[#2F3EFF]/80' : 'bg-gray-800 hover:bg-gray-700'} text-white border-none`}
        >
          <MonitorUp className="w-5 h-5" />
        </Button>
        
        <div className="w-px h-8 bg-gray-800 mx-2"></div>
        
        <Button 
          onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }} 
          className={`h-12 w-12 rounded-full flex items-center justify-center ${showParticipants ? 'bg-[#2F3EFF]/20 text-[#2F3EFF]' : 'bg-gray-800 hover:bg-gray-700 text-white'} border-none`}
        >
          <Users className="w-5 h-5" />
        </Button>
        <Button 
          onClick={() => { setShowChat(!showChat); setShowParticipants(false); }} 
          className={`h-12 w-12 rounded-full flex items-center justify-center ${showChat ? 'bg-[#2F3EFF]/20 text-[#2F3EFF]' : 'bg-gray-800 hover:bg-gray-700 text-white'} border-none`}
        >
          <MessageSquare className="w-5 h-5" />
        </Button>
        
        <Button 
          className="h-12 w-12 rounded-full bg-gray-800 hover:bg-gray-700 text-white flex items-center justify-center border-none ml-2"
        >
          <Settings className="w-5 h-5" />
        </Button>

        <Button 
          onClick={handleLeave} 
          className="h-12 px-6 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold border-none ml-6"
        >
          <PhoneOff className="w-5 h-5 mr-2" />
          Leave
        </Button>
      </footer>
    </div>
  );
}
