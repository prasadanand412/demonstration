import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, User as UserIcon, Heart, Phone, Droplet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Profile() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    age: "",
    gender: "",
    blood_group: "",
    allergies: "",
    emergency_contact: "",
    profile_photo_url: "",
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setProfile({
        name: data.name || "",
        age: data.age?.toString() || "",
        gender: data.gender || "",
        blood_group: data.blood_group || "",
        allergies: data.allergies || "",
        emergency_contact: data.emergency_contact || "",
        profile_photo_url: data.profile_photo_url || "",
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/profile.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from("profile-photos")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast({
        title: "Upload failed",
        description: uploadError.message,
        variant: "destructive",
      });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(fileName);

    setProfile({ ...profile, profile_photo_url: publicUrl });
    setUploading(false);

    toast({
      title: "Photo uploaded",
      description: "Your profile photo has been updated",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        name: profile.name,
        age: profile.age ? parseInt(profile.age) : null,
        gender: profile.gender || null,
        blood_group: profile.blood_group || null,
        allergies: profile.allergies || null,
        emergency_contact: profile.emergency_contact || null,
        profile_photo_url: profile.profile_photo_url || null,
      })
      .eq("user_id", user.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-display font-bold mb-2">My Profile</h2>
        <p className="text-muted-foreground">Manage your health information</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="health-card md:col-span-1">
          <CardHeader>
            <CardTitle className="text-center">Profile Photo</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={profile.profile_photo_url} alt={profile.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                {profile.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Label htmlFor="photo-upload" className="cursor-pointer">
              <div className="btn-medical bg-secondary text-secondary-foreground hover:bg-secondary-hover flex items-center gap-2">
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Change Photo
                  </>
                )}
              </div>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </Label>
          </CardContent>
        </Card>

        <Card className="health-card md:col-span-2">
          <CardHeader>
            <CardTitle>Health ID Card</CardTitle>
            <CardDescription>Quick reference for emergency situations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-gradient-to-br from-primary via-primary-hover to-secondary p-6 text-white shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs uppercase tracking-wider opacity-90">Health ID</p>
                  <h3 className="text-2xl font-display font-bold mt-1">{profile.name || "Your Name"}</h3>
                </div>
                <Heart className="h-8 w-8 opacity-90" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <p className="text-xs opacity-75 flex items-center gap-1">
                    <UserIcon className="h-3 w-3" />
                    Age / Gender
                  </p>
                  <p className="font-semibold mt-1">{profile.age || "—"} / {profile.gender || "—"}</p>
                </div>
                <div>
                  <p className="text-xs opacity-75 flex items-center gap-1">
                    <Droplet className="h-3 w-3" />
                    Blood Group
                  </p>
                  <p className="font-semibold mt-1">{profile.blood_group || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs opacity-75">Allergies</p>
                  <p className="font-semibold mt-1 line-clamp-2">{profile.allergies || "None reported"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs opacity-75 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Emergency Contact
                  </p>
                  <p className="font-semibold mt-1">{profile.emergency_contact || "—"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="health-card">
        <CardHeader>
          <CardTitle>Edit Profile Information</CardTitle>
          <CardDescription>Update your personal health details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  required
                  className="input-medical"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                  className="input-medical"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={profile.gender} onValueChange={(value) => setProfile({ ...profile, gender: value })}>
                  <SelectTrigger className="input-medical">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="blood_group">Blood Group</Label>
                <Select value={profile.blood_group} onValueChange={(value) => setProfile({ ...profile, blood_group: value })}>
                  <SelectTrigger className="input-medical">
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                value={profile.allergies}
                onChange={(e) => setProfile({ ...profile, allergies: e.target.value })}
                placeholder="List any known allergies..."
                className="input-medical resize-none"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emergency_contact">Emergency Contact</Label>
              <Input
                id="emergency_contact"
                value={profile.emergency_contact}
                onChange={(e) => setProfile({ ...profile, emergency_contact: e.target.value })}
                placeholder="Phone number and name"
                className="input-medical"
              />
            </div>

            <Button
              type="submit"
              className="bg-primary hover:bg-primary-hover"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}