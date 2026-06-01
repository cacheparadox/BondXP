"use client";

import React, { useEffect, useState, useRef } from "react";
import AppShell from "@/components/layout/AppShell";
import { createClient } from "@/lib/supabase/client";
import { Note, User } from "@/types/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Send, Image as ImageIcon, Trash2, X, Sparkles, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function NotesPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [profile, setProfile] = useState<User | null>(null);
  const [partner, setPartner] = useState<User | null>(null);

  // Form States
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch current user profile
      const { data: prof, error: profError } = await (supabase
        .from("users") as any)
        .select("*")
        .eq("id", user.id)
        .single();

      if (profError || !prof) {
        toast.error("Failed to load profile details");
        return;
      }
      setProfile(prof as User);

      // 2. Fetch partner profile if connected
      if (prof.couple_session_id) {
        const { data: part } = await (supabase
          .from("users") as any)
          .select("*")
          .eq("couple_session_id", prof.couple_session_id)
          .neq("id", user.id)
          .maybeSingle();
        
        setPartner(part as User | null);

        // 3. Fetch notes for this couple session
        const { data: notesData, error: notesError } = await (supabase
          .from("notes") as any)
          .select("*")
          .eq("couple_session_id", prof.couple_session_id)
          .order("created_at", { ascending: false });

        if (notesError) throw notesError;
        setNotes(notesData || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notes timeline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const compressImage = (file: File, maxWidth: number = 1200, maxHeight: number = 1200, quality: number = 0.75): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selected file must be an image");
      return;
    }

    const toastId = toast.loading("Compressing image...");
    try {
      const compressed = await compressImage(file);
      setSelectedFile(compressed);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        toast.dismiss(toastId);
        
        const savedPercent = Math.max(0, Math.round(((file.size - compressed.size) / file.size) * 100));
        if (savedPercent > 10) {
          toast.success(`Image compressed! (Saved ${savedPercent}% size) 📸`);
        } else {
          toast.success("Image optimized! 📸");
        }
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      console.error(err);
      toast.dismiss(toastId);
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image is too large (max 5MB without compression)");
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !selectedFile) {
      toast.error("Please enter a note or choose an image");
      return;
    }

    if (!profile || !profile.couple_session_id) {
      toast.error("You must be paired in a couple session to write notes");
      return;
    }

    setSubmitting(true);
    let uploadedImageUrl: string | null = null;

    try {
      // 1. Upload image to Supabase storage if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${profile.couple_session_id}/${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("notes-images")
          .upload(fileName, selectedFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data } = supabase.storage
          .from("notes-images")
          .getPublicUrl(fileName);
        
        uploadedImageUrl = data.publicUrl;
      }

      // 2. Insert note into database
      const { data: newNote, error: insertError } = await (supabase
        .from("notes") as any)
        .insert({
          couple_session_id: profile.couple_session_id,
          sender_id: profile.id,
          content: content.trim(),
          image_url: uploadedImageUrl,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Send NTFY push alert if partner has a topic configured
      if (partner && partner.ntfy_topic) {
        const topic = partner.ntfy_topic.trim();
        if (topic) {
          fetch(`https://ntfy.sh/${topic}`, {
            method: "POST",
            headers: {
              "Title": "New Memory! 💖",
              "Tags": "heart,love_letter",
            },
            body: "You got a new note in your Cute Corner!",
          }).catch((err) => console.error("Failed to send client-side NTFY note alert:", err));
        }
      }

      // 3. Clear form state & reload
      setContent("");
      setSelectedFile(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      toast.success("Memory saved to Cute Corner! 💖");
      setNotes((prev) => [newNote as Note, ...prev]);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to post note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note from your Cute Corner?")) {
      return;
    }

    setDeletingId(noteId);
    try {
      const { error } = await (supabase
        .from("notes") as any)
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      toast.success("Note removed.");
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete note");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  const getUserInitials = (user: User | null) => {
    if (!user || !user.display_name) return "?";
    return user.display_name.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-dark text-white">
        <span className="text-white/50 text-xs font-heading font-semibold uppercase tracking-widest animate-pulse">
          Opening Cute Corner...
        </span>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="page-content max-w-4xl w-full mx-auto space-y-8">
        
        {/* Header Hero Area */}
        <div className="relative rounded-3xl overflow-hidden p-6 md:p-8 bg-gradient-to-r from-primary/20 via-accent/10 to-transparent border border-white/[0.06] shadow-glow-primary-sm">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Cozy Shared Space
              </span>
              <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight">
                Cute Corner
              </h1>
              <p className="text-xs text-white/50 font-body max-w-lg">
                Your private dashboard for affection. Drop sweet notes, schedule surprises, upload pictures, and log beautiful memories only you two can see.
              </p>
            </div>
            
            {/* Duo Info */}
            <div className="flex items-center gap-3.5 bg-black/40 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/[0.06]">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary font-heading shadow-md">
                  {getUserInitials(profile)}
                </div>
                <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-xs font-bold text-accent font-heading shadow-md">
                  {getUserInitials(partner)}
                </div>
              </div>
              <div className="text-[10px] font-heading font-semibold text-white/60">
                {partner ? `Connected with ${partner.display_name}` : "Waiting for partner..."}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          
          {/* Note Poster Form (Sticky Card Style) */}
          <div className="md:col-span-1">
            <form onSubmit={handlePostNote} className="card bg-white/[0.02] border-white/[0.06] p-5 space-y-4 sticky top-6">
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5 border-b border-white/[0.04] pb-2">
                <Heart className="w-4 h-4 text-primary fill-primary" />
                Drop a Note
              </h3>

              <div className="space-y-1">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tell your partner something sweet..."
                  className="w-full h-32 rounded-xl p-3 text-xs font-body bg-black/40 border border-white/[0.08] outline-none focus:border-primary text-white placeholder-white/30 resize-none transition-all"
                  maxLength={500}
                />
              </div>

              {/* Image selector & preview */}
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-black/25 p-1 flex flex-col">
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                      <Image
                        src={imagePreview}
                        alt="Upload preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/75 hover:bg-black border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3.5 px-4 rounded-xl border border-dashed border-white/[0.08] hover:border-primary/40 bg-white/[0.01] hover:bg-primary/5 text-xs text-white/40 hover:text-primary transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
                  >
                    <div className="p-2 rounded-full bg-white/[0.02] group-hover:bg-primary/10 border border-white/[0.04] group-hover:border-primary/20 transition-all">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="font-heading font-semibold">Attach a photo</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 font-bold text-xs cursor-pointer shadow-glow-primary-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send to Partner
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Notes Feed Timeline */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-sm font-heading font-bold uppercase tracking-wider text-white/50 flex items-center gap-2">
              <span>💖 Shared Love Stream</span>
              <span className="px-2 py-0.5 rounded-full bg-white/[0.04] text-[10px] text-white/40 font-mono">
                {notes.length}
              </span>
            </h2>

            {notes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card bg-white/[0.01] border-white/[0.04] p-10 flex flex-col items-center justify-center text-center space-y-3"
              >
                <div className="w-12 h-12 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center text-primary text-xl">
                  💝
                </div>
                <h4 className="font-heading font-bold text-sm text-white">Your Cute Corner is empty!</h4>
                <p className="text-[11px] font-body text-white/40 max-w-xs leading-relaxed">
                  Start the spark! Type a message or upload a cute selfie on the left to write your very first couple memory.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {notes.map((note) => {
                    const isOwnNote = note.sender_id === profile?.id;
                    const senderName = isOwnNote 
                      ? (profile?.display_name || "You") 
                      : (partner?.display_name || "Partner");

                    return (
                      <motion.div
                        key={note.id}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className={`card bg-white/[0.02] border-white/[0.06] p-4 flex flex-col gap-3 relative group overflow-hidden ${
                          isOwnNote 
                            ? "border-l-primary/30 bg-gradient-to-r from-primary/[0.01] to-transparent" 
                            : "border-l-accent/30 bg-gradient-to-r from-accent/[0.01] to-transparent"
                        }`}
                      >
                        {/* Note Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            {/* User Initial Circle */}
                            <div className={`w-6 h-6 rounded-full text-[9px] font-bold font-heading flex items-center justify-center border shadow-sm ${
                              isOwnNote 
                                ? "bg-primary/10 border-primary/30 text-primary" 
                                : "bg-accent/10 border-accent/30 text-accent"
                            }`}>
                              {isOwnNote ? getUserInitials(profile) : getUserInitials(partner)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-heading font-bold text-white/80">
                                {senderName}
                              </span>
                              <span className="text-[8px] font-body text-white/40">
                                {formatDate(note.created_at)}
                              </span>
                            </div>
                          </div>

                          {/* Delete Action */}
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            disabled={deletingId === note.id}
                            className="text-white/30 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer focus:opacity-100 disabled:opacity-50"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Note Content */}
                        {note.content && (
                          <p className="text-xs text-white/80 font-body leading-relaxed whitespace-pre-wrap">
                            {note.content}
                          </p>
                        )}

                        {/* Note Image (Polaroid Card style) */}
                        {note.image_url && (
                          <div className="relative mt-1 rounded-xl overflow-hidden border border-white/[0.08] bg-black/40 p-1.5 flex flex-col shadow-inner">
                            <div className="relative aspect-video w-full rounded-lg overflow-hidden">
                              <Image
                                src={note.image_url}
                                alt="Memory picture"
                                fill
                                className="object-cover transition-transform duration-500 hover:scale-105"
                                unoptimized
                              />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

        </div>

      </div>
    </AppShell>
  );
}
