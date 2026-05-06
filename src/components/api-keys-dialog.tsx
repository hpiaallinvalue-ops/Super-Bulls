'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, Eye, EyeOff, Trash2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth-context';
import { saveApiKey, getApiKeys, deleteApiKey } from '@/lib/firestore-secrets';

interface ApiKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const YOUTUBE_API_KEY_NAME = 'NEXT_PUBLIC_YOUTUBE_API_KEY';

export function ApiKeysDialog({ open, onOpenChange }: ApiKeysDialogProps) {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [currentKey, setCurrentKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hasLoadedRef = useRef(false);

  // Track open state transitions to trigger load
  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Dialog just opened - load keys
      if (user && !hasLoadedRef.current) {
        hasLoadedRef.current = true;
        getApiKeys(user.uid)
          .then((keys) => {
            const ytKey = keys[YOUTUBE_API_KEY_NAME] || '';
            setApiKey(ytKey);
            setCurrentKey(ytKey);
          })
          .catch(() => {
            toast.error('Failed to load API keys.');
          })
          .finally(() => {
            setLoading(false);
          });
        setLoading(true);
      }
    }
    if (!open) {
      hasLoadedRef.current = false;
    }
    prevOpenRef.current = open;
  }, [open, user]);

  const handleSave = async () => {
    if (!user || !apiKey.trim()) return;
    setSaving(true);
    try {
      await saveApiKey(user.uid, YOUTUBE_API_KEY_NAME, apiKey.trim());
      setCurrentKey(apiKey.trim());
      toast.success('API key saved successfully.');
      onOpenChange(false);
    } catch {
      toast.error('Failed to save API key. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteApiKey(user.uid, YOUTUBE_API_KEY_NAME);
      setApiKey('');
      setCurrentKey('');
      toast.success('API key deleted.');
    } catch {
      toast.error('Failed to delete API key.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-red-600" />
            API Keys
          </DialogTitle>
          <DialogDescription>
            Manage your YouTube API key. It will be stored securely and used across all your devices.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-api-key">YouTube API Key</Label>
              <div className="relative">
                <Input
                  id="youtube-api-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder="Enter your YouTube Data API v3 key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 size-9"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your API key from the{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-600 hover:underline"
                >
                  Google Cloud Console
                </a>
              </p>
            </div>

            {currentKey && !apiKey && (
              <p className="text-sm text-muted-foreground">
                A saved API key exists. Enter a new one or delete it below.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {currentKey && (
            <Button
              variant="destructive"
              size="sm"
              className="mr-auto"
              onClick={handleDelete}
              disabled={deleting || loading}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading || !apiKey.trim()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
