import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Zap, 
  Send, 
  Bot, 
  User, 
  Clock, 
  Coins, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Cpu, 
  Sparkles,
  RefreshCw,
  Info,
  Copy,
  Check
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  environment: string;
}

interface Message {
  id: string;
  sender: "user" | "agent" | "system";
  text: string;
  timestamp: Date;
  status?: "allowed" | "blocked" | "flagged" | "steered";
}

interface AuditTrail {
  steering_applied: boolean;
  steering_action: string;
  steering_reason: string;
  pre_check?: string;
  output_check?: string;
  reason?: string;
  metrics?: {
    tokens: number;
    cost: number;
    latency: number;
  };
}

export default function Playground() {
  const { currentWorkspace } = useWorkspace();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [prompt, setPrompt] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [auditTrace, setAuditTrace] = useState<AuditTrail | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch agents and find/create API Key on load
  useEffect(() => {
    if (!currentWorkspace) return;
    
    const fetchAgents = async () => {
      const { data } = await supabase
        .from("agents")
        .select("id, name, environment")
        .eq("workspace_id", currentWorkspace.id);
      
      const agentList = (data as Agent[]) || [];
      setAgents(agentList);
      if (agentList.length > 0) {
        setSelectedAgentId(agentList[0].id);
      }
    };

    const loadOrCreateApiKey = async () => {
      // Look for an existing key hash first
      const { data: keys, error } = await supabase
        .from("api_keys")
        .select("id, label")
        .filter("revoked_at", "is", null)
        .limit(1);

      if (error) {
        console.error("Error loading keys:", error);
        return;
      }

      if (keys && keys.length > 0) {
        // Since we store hashes, we check if we stored the raw key in localStorage previously
        const storedRaw = localStorage.getItem(`op_raw_key_${currentWorkspace.id}`);
        if (storedRaw) {
          setApiKey(storedRaw);
        } else {
          // If not in local storage, we prompt creation
          await generateNewKey();
        }
      } else {
        await generateNewKey();
      }
    };

    fetchAgents();
    loadOrCreateApiKey();
    generateNewSession();
  }, [currentWorkspace]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateNewSession = () => {
    setSessionId(`sess_${Math.random().toString(36).substring(2, 10)}`);
    setMessages([
      {
        id: "sys_init",
        sender: "system",
        text: "New chat session initialized. Send prompts to evaluate steering policies.",
        timestamp: new Date()
      }
    ]);
    setAuditTrace(null);
  };

  const generateNewKey = async () => {
    if (!currentWorkspace) return;
    
    try {
      const raw = 'op_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Hash with SHA-256
      const encoder = new TextEncoder();
      const data = encoder.encode(raw);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase.from("api_keys").insert({
        workspace_id: currentWorkspace.id,
        key_hash: keyHash,
        label: "Playground Generated Key",
        created_by: user.user?.id || null
      });

      if (error) {
        toast.error("Failed to register new API Key");
        console.error(error);
      } else {
        setApiKey(raw);
        localStorage.setItem(`op_raw_key_${currentWorkspace.id}`, raw);
        toast.success("New developer API Key generated");
      }
    } catch (err) {
      console.error("Key generation failed:", err);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    toast.success("API Key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const sendPrompt = async (textToSend?: string) => {
    const promptText = textToSend || prompt;
    if (!promptText.trim()) return;
    if (!selectedAgentId) {
      toast.error("Please register and select an Agent first.");
      return;
    }
    if (!apiKey) {
      toast.error("Missing API Key. Regenerating...");
      await generateNewKey();
      return;
    }

    setPrompt("");
    setLoading(true);

    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      sender: "user",
      text: promptText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Call the Vercel serverless function endpoint locally
      const response = await fetch("/api/inference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey
        },
        body: JSON.stringify({
          agent_id: selectedAgentId,
          session_id: sessionId,
          prompt: promptText,
          parameters: {
            temperature
          }
        })
      });

      const result = await response.json();

      if (!response.ok && response.status !== 403) {
        throw new Error(result.error || "Failed to contact local inference endpoint");
      }

      setAuditTrace(result.audit_trail || null);

      const agentMsg: Message = {
        id: `msg_agent_${Date.now()}`,
        sender: "agent",
        text: result.response || result.error || "No response returned",
        timestamp: new Date(),
        status: result.decision // 'allow', 'block', 'flagged', 'steered'
      };

      setMessages(prev => [...prev, agentMsg]);

    } catch (err: any) {
      toast.error(err.message || "Request failed");
      console.error(err);
      
      setMessages(prev => [...prev, {
        id: `msg_err_${Date.now()}`,
        sender: "system",
        text: `Error: ${err.message || "Failed to process request. Make sure your local vite server is running."}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const triggerViolation = (type: "pii" | "competitor") => {
    if (type === "pii") {
      sendPrompt("Can you check my record? My social security number is 123-45-6789 and my email is test@example.com.");
    } else {
      sendPrompt("What is competitor AcmeCorp's tier pricing versus our platform tier pricing?");
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "block":
        return <Badge variant="destructive" className="ml-2">Denied by QMS</Badge>;
      case "flag":
        return <Badge variant="outline" className="ml-2 border-amber-500/30 text-amber-500 bg-amber-500/10">Output Flagged</Badge>;
      case "update":
        return <Badge variant="outline" className="ml-2 border-cyan-500/30 text-cyan-500 bg-cyan-500/10">Steered Output</Badge>;
      case "allow":
        return <Badge variant="outline" className="ml-2 border-emerald-500/30 text-emerald-500 bg-emerald-500/10">Cleared</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">QMS Steering Playground</h1>
        <p className="text-sm text-muted-foreground">
          Interact with agents, configure policies, and inspect enunciation steering in real-time.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar Configuration - 3/12 width */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                Inference Config
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Agent</Label>
                {agents.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No agents registered. Add one in the Agents page.</p>
                ) : (
                  <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Select Agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.environment})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex justify-between">
                  <span>Temperature</span>
                  <span className="font-mono text-xs text-muted-foreground">{temperature}</span>
                </Label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1" 
                  value={temperature} 
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-primary bg-muted rounded-lg appearance-none h-1.5 cursor-pointer"
                />
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Active Session ID</Label>
                  <Button variant="ghost" size="sm" onClick={generateNewSession} className="h-6 px-1.5 text-[10px] text-primary">
                    <RefreshCw className="h-3 w-3 mr-1" />New Session
                  </Button>
                </div>
                <Input value={sessionId} readOnly className="font-mono text-xs h-8 bg-muted/30 border-dashed" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                API Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">x-api-key</Label>
                <div className="flex gap-2">
                  <Input 
                    type={showKey ? "text" : "password"} 
                    value={apiKey} 
                    readOnly 
                    className="font-mono text-[11px] h-8 bg-muted/40" 
                  />
                  <Button variant="outline" size="sm" onClick={() => setShowKey(!showKey)} className="h-8 px-2 text-xs">
                    {showKey ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard} className="flex-1 h-7 text-[10px]">
                  {copied ? <Check className="h-3 w-3 mr-1 text-emerald-500" /> : <Copy className="h-3 w-3 mr-1" />}
                  Copy Key
                </Button>
                <Button variant="ghost" size="sm" onClick={generateNewKey} className="flex-1 h-7 text-[10px] text-muted-foreground hover:text-foreground">
                  Regenerate
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Steering Test Prompts</CardTitle>
              <CardDescription className="text-[10px]">Pre-configured queries to test enunciation boundaries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => triggerViolation("pii")} 
                disabled={loading}
                className="w-full text-left justify-start text-[11px] h-auto py-2 bg-muted/10 hover:bg-muted/40 text-wrap leading-tight"
              >
                💥 SSN/Email PII Violation
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => triggerViolation("competitor")}
                disabled={loading}
                className="w-full text-left justify-start text-[11px] h-auto py-2 bg-muted/10 hover:bg-muted/40 text-wrap leading-tight"
              >
                ⚔️ Competitor Pricing Check
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Chat Arena - 5/12 width */}
        <div className="lg:col-span-5 flex flex-col h-[580px] border border-border rounded-xl overflow-hidden bg-card/60 backdrop-blur-md">
          {/* Chat Header */}
          <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold">Standalone Chat Gateway</span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">/api/inference</span>
          </div>

          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4 bg-muted/10">
            <div className="space-y-4">
              {messages.map((m) => (
                <div 
                  key={m.id} 
                  className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div 
                    className={`max-w-[85%] rounded-lg p-3 text-sm ${
                      m.sender === "user" 
                        ? "bg-primary text-primary-foreground font-medium rounded-tr-none" 
                        : m.sender === "system"
                        ? "bg-muted/80 text-muted-foreground italic text-center w-full text-xs"
                        : "bg-muted text-foreground rounded-tl-none border border-border"
                    }`}
                  >
                    {m.sender === "agent" && (
                      <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-border/40 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Bot className="h-3 w-3" /> Agent Gateway
                        </span>
                        {getStatusBadge(m.status)}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    {m.sender !== "system" && (
                      <span className="block text-[9px] text-right mt-1 opacity-50 font-mono">
                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="p-4 border-t border-border bg-muted/20">
            <div className="flex gap-2">
              <Input 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendPrompt()}
                placeholder="Type your user query..."
                disabled={loading}
                className="bg-background h-10 border-border"
              />
              <Button onClick={() => sendPrompt()} disabled={loading} className="h-10 px-4">
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Audit Trace Dashboard - 4/12 width */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-border bg-card/65 backdrop-blur-md h-[580px] flex flex-col">
            <CardHeader className="pb-4 border-b border-border bg-muted/10">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                QMS Enunciative Audit Trace
              </CardTitle>
              <CardDescription className="text-xs">Step-by-step verification pipeline</CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex-1 overflow-y-auto">
              {!auditTrace ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-6 space-y-3">
                  <Info className="h-8 w-8 opacity-30" />
                  <p className="text-xs italic">Send a query to visualize the real-time AI steering audit trail.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Performance Metrics */}
                  {auditTrace.metrics && (
                    <div className="grid grid-cols-3 gap-2 p-3 bg-muted/40 rounded-lg border border-border">
                      <div className="text-center space-y-1">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground font-medium">
                          <Clock className="h-3 w-3" /> Latency
                        </div>
                        <p className="font-mono text-xs font-semibold text-cyan-400">{auditTrace.metrics.latency} ms</p>
                      </div>
                      <div className="text-center space-y-1 border-x border-border">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground font-medium">
                          <Coins className="h-3 w-3" /> Estimate Cost
                        </div>
                        <p className="font-mono text-xs font-semibold text-emerald-400">${auditTrace.metrics.cost.toFixed(5)}</p>
                      </div>
                      <div className="text-center space-y-1">
                        <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground font-medium">
                          <Cpu className="h-3 w-3" /> Total Tokens
                        </div>
                        <p className="font-mono text-xs font-semibold">{auditTrace.metrics.tokens}</p>
                      </div>
                    </div>
                  )}

                  {/* Trace Timeline */}
                  <div className="relative border-l-2 border-border/80 ml-3.5 pl-6 space-y-6 py-2">
                    
                    {/* Step 1: Precheck */}
                    <div className="relative">
                      <div className={`absolute -left-[35px] rounded-full p-1 border ${
                        auditTrace.pre_check === "blocked"
                          ? "bg-destructive border-destructive text-destructive-foreground"
                          : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      }`}>
                        {auditTrace.pre_check === "blocked" ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold font-mono">1. PRE-INFERENCE POLICY CHECK</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {auditTrace.pre_check === "blocked"
                            ? `Blocked: ${auditTrace.reason}`
                            : "Cleared: User prompt matches all active security and compliance rules."}
                        </p>
                      </div>
                    </div>

                    {/* Step 2: History & Aigement */}
                    <div className="relative">
                      <div className={`absolute -left-[35px] rounded-full p-1 border ${
                        auditTrace.steering_applied
                          ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
                          : "bg-muted border-border text-muted-foreground"
                      }`}>
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold font-mono">2. AIGEMENT STATEFUL STEERING</h4>
                        <div className="text-[11px] text-muted-foreground mt-1 space-y-1 bg-muted/20 p-2 rounded border border-border">
                          <div className="flex justify-between font-mono text-[9px] text-muted-foreground">
                            <span>Steering Applied:</span>
                            <span className={auditTrace.steering_applied ? "text-cyan-400 font-bold" : ""}>
                              {auditTrace.steering_applied ? "YES" : "NO"}
                            </span>
                          </div>
                          {auditTrace.steering_applied && (
                            <div className="flex justify-between font-mono text-[9px] text-muted-foreground">
                              <span>Steering Action:</span>
                              <span className="text-cyan-400 font-semibold">{auditTrace.steering_action}</span>
                            </div>
                          )}
                          <p className="text-[10px] mt-1 text-foreground leading-normal">{auditTrace.steering_reason}</p>
                        </div>
                      </div>
                    </div>

                    {/* Step 3: LLM Execution */}
                    <div className="relative">
                      <div className="absolute -left-[35px] rounded-full p-1 border bg-muted border-border text-muted-foreground">
                        <Cpu className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold font-mono">3. LLM EXECUTION PIPELINE</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          Inference processed via `gpt-4o-mini` serverless proxy. 
                          {auditTrace.steering_applied && " Injected active steering directives successfully."}
                        </p>
                      </div>
                    </div>

                    {/* Step 4: Post-inference safety checks */}
                    <div className="relative">
                      <div className={`absolute -left-[35px] rounded-full p-1 border ${
                        auditTrace.output_check === "flagged"
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-500"
                          : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                      }`}>
                        {auditTrace.output_check === "flagged" ? <AlertTriangle className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold font-mono">4. POST-INFERENCE COMPLIANCE</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                          {auditTrace.output_check === "flagged"
                            ? `Warning Flagged: Output violates policy. Raised incident comment and registered warning.`
                            : "Cleared: The generated model response does not leak PII or violate competitor rules."}
                        </p>
                      </div>
                    </div>

                    {/* Step 5: Ledger */}
                    <div className="relative">
                      <div className="absolute -left-[35px] rounded-full p-1 border bg-emerald-500/20 border-emerald-500/40 text-emerald-400">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold font-mono">5. COMPLIANCE AUDIT LEDGER</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed font-mono text-[10px]">
                          Committed immutable transaction block to `audit_logs` table. Decision: [{
                            auditTrace.pre_check === "blocked" ? "BLOCK" : (auditTrace.output_check === "flagged" ? "FLAG" : (auditTrace.steering_applied ? "UPDATE" : "ALLOW"))
                          }].
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
