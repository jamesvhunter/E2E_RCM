"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Mic, ArrowUp } from "lucide-react";

export function SchedulesChatPanel() {
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    setChatHistory((prev) => [
      ...prev,
      { role: "user", content: message },
      { role: "assistant", content: "Schedule chat assistant is coming soon. This will help you manage appointments via conversation." },
    ]);
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="w-80 border-r bg-muted/20 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Schedules</h2>
        </div>
      </div>

      {/* Quick actions */}
      <div className="p-4 space-y-2 border-b">
        <Button variant="ghost" className="w-full justify-start text-sm">
          Show High-Risk Visits
        </Button>
        <Button variant="ghost" className="w-full justify-start text-sm">
          60-sec Day Brief
        </Button>
        <Button variant="ghost" className="w-full justify-start text-sm">
          Prep Next Patient
        </Button>
        <Button variant="ghost" className="w-full justify-start text-sm">
          Review New Tasks
        </Button>
      </div>

      {/* Chat messages */}
      <ScrollArea className="flex-1 p-4">
        {chatHistory.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            <p className="mb-4">Good morning, Dr. Zimmerman. You have 28 patients today. I've already reviewed chart history and intake and pulled up the highest-risk visits and the follow-ups that came in since your last login. Where should we start?</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground p-3 rounded-lg ml-4"
                    : "text-muted-foreground"
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t bg-background">
        <div className="text-xs text-muted-foreground mb-2">
          Chat about <span className="font-medium">Schedules</span>
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[60px] resize-none"
          />
          <div className="flex flex-col gap-2">
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Mic className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!message.trim()}
              className="h-8 w-8"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
