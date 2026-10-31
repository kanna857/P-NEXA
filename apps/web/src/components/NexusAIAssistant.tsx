import React, { useState } from 'react';
import {
  Bot,
  Send,
  Mic,
  AlertTriangle,
  PlaySquare,
  Cpu,
  Workflow,
  Network,
  FileText,
  ChevronRight,
  ChevronLeft,
  Sparkles
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const NexusAIAssistant: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'assistant',
      text: 'Hello, Alex! I can help you analyze, simulate, investigate and automate your digital world.',
      timestamp: '10:24 AM'
    }
  ]);
  const [isThinking, setIsThinking] = useState<boolean>(false);

  const suggestedPrompts = [
    'Why is the main server down?',
    'What happens if 5 buses are delayed?',
    'Show affected students and classes',
    'Create a recovery plan for auth system',
    'Compare 3 solutions for this incident'
  ];

  const actionCards = [
    { label: 'Analyze an incident', icon: AlertTriangle, color: 'text-neon-crimson' },
    { label: 'Simulate a scenario', icon: PlaySquare, color: 'text-neon-purple' },
    { label: 'Optimize resources', icon: Cpu, color: 'text-neon-cyan' },
    { label: 'Create a workflow', icon: Workflow, color: 'text-neon-matrix' },
    { label: 'Ask about the graph', icon: Network, color: 'text-blue-400' },
    { label: 'Generate a report', icon: FileText, color: 'text-amber-400' }
  ];

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputPrompt;
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsThinking(true);

    // Contextual autonomous AI response simulation
    setTimeout(() => {
      let reply = `Synthesizing neural twin telemetry for "${text}"...`;
      if (text.toLowerCase().includes('main server') || text.toLowerCase().includes('down')) {
        reply =
          'Incident Analysis: Main Authentication Server (srv-auth) failed due to a sudden socket exhaustion anomaly at 10:24 AM. 3,842 users affected. Investigator Agent recommends immediate traffic re-routing to Secondary Auth Gateway.';
      } else if (text.toLowerCase().includes('bus') || text.toLowerCase().includes('delay')) {
        reply =
          'Simulation Result: 5 delayed campus transit units will cascade a 14% attendance latency across Academic Block 3. Simulation Agent proposes dispatching 2 auxiliary shuttles from Sports Complex depot.';
      } else if (text.toLowerCase().includes('recovery plan') || text.toLowerCase().includes('auth')) {
        reply =
          'Response Plan: Formulated dual-custody playbook "AUTH-EMERGENCY-FAILOVER". Estimated recovery time: 15 minutes. Requires 2 command signatures to execute.';
      } else if (text.toLowerCase().includes('compare 3')) {
        reply =
          'Scenario Comparison: Scenario A (Backup Server: 15m downtime, $500 cost, 92% success). Scenario B (Load Distribution: 30m downtime, $900 cost, 78% success). Scenario C (Wait & Monitor: 2-4h downtime, 45% success). Recommendation: Scenario A.';
      }

      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsThinking(false);
    }, 700);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-l border-surface-border bg-slate-950 flex flex-col items-center py-4 select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-neon-cyan border border-slate-800 transition-all shadow-lg"
          title="Expand NEXUS AI Assistant"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="mt-8 flex flex-col items-center space-y-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-cyan-500 p-[1.5px] shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-neon-cyan" />
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 [writing-mode:vertical-lr] tracking-widest uppercase">
            AI Assistant
          </span>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-80 border-l border-surface-border bg-slate-950/95 backdrop-blur-md flex flex-col justify-between p-4 font-mono select-none overflow-y-auto">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-purple-900/40 border border-purple-500/40 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-neon-purple" />
            </div>
            <span className="text-xs font-bold text-white tracking-wide">NEXUS AI Assistant</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-neon-matrix/10 text-neon-matrix border border-neon-matrix/30 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-matrix animate-ping" />
              <span>Online</span>
            </span>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 rounded text-slate-500 hover:text-white"
              title="Collapse"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Holographic AI Avatar Orb */}
        <div className="flex flex-col items-center py-2 text-center">
          <div className="relative w-16 h-16 flex items-center justify-center mb-2">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 opacity-40 blur-md animate-pulse" />
            <div className="w-14 h-14 rounded-full border border-neon-cyan/50 bg-slate-900/90 flex items-center justify-center relative shadow-inner">
              <Bot className="w-7 h-7 text-neon-cyan animate-bounce" />
            </div>
          </div>
          <div className="text-xs font-bold text-white">Hello, Alex!</div>
          <p className="text-[10px] text-slate-400 mt-1 leading-snug max-w-[240px]">
            I can help you analyze, simulate, investigate and automate your digital world.
          </p>
        </div>

        {/* Action Shortcut Chips Grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {actionCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                onClick={() => handleSendMessage(card.label)}
                className="p-2 rounded-lg bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition-all group flex items-center space-x-2"
              >
                <Icon className={`w-3.5 h-3.5 ${card.color} flex-shrink-0`} />
                <span className="text-[10px] text-slate-300 group-hover:text-white truncate">
                  {card.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Chat History Pane */}
        <div className="h-44 overflow-y-auto space-y-2 p-2 rounded-xl bg-slate-900/40 border border-slate-900 text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-2.5 rounded-lg leading-relaxed text-[11px] ${
                msg.sender === 'user'
                  ? 'bg-purple-950/50 border border-purple-900/50 text-purple-200 ml-4'
                  : 'bg-slate-950/80 border border-slate-800 text-slate-300 mr-2'
              }`}
            >
              <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                <span>{msg.sender === 'user' ? 'Operator' : 'NEXUS Intelligence'}</span>
                <span>{msg.timestamp}</span>
              </div>
              <p>{msg.text}</p>
            </div>
          ))}
          {isThinking && (
            <div className="p-2 rounded bg-slate-950/50 text-slate-400 text-[10px] animate-pulse flex items-center space-x-1.5">
              <Sparkles className="w-3 h-3 text-neon-purple" />
              <span>Analyzing graph telemetry...</span>
            </div>
          )}
        </div>

        {/* Suggested Prompts */}
        <div className="space-y-1">
          <div className="text-[9px] uppercase tracking-wider text-slate-500">Suggested Prompts</div>
          <div className="space-y-1">
            {suggestedPrompts.slice(0, 3).map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSendMessage(prompt)}
                className="w-full text-left px-2 py-1 rounded bg-slate-900/30 hover:bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 truncate transition-all"
              >
                &bull; {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input Prompt Box */}
      <div className="pt-3 border-t border-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="Ask anything about your university..."
            className="w-full px-3 py-2 pr-14 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs placeholder:text-slate-500 focus:outline-none focus:border-neon-purple transition-all"
          />
          <div className="absolute right-2 flex items-center space-x-1">
            <button
              type="button"
              className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
              title="Voice Input"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>
            <button
              type="submit"
              className="p-1 rounded-lg bg-neon-purple hover:bg-purple-600 text-white transition-all shadow-md shadow-purple-600/30"
              title="Send"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
};
