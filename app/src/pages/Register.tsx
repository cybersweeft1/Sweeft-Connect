import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  auth,
  db,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  doc,
  setDoc,
  serverTimestamp,
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL,
} from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Zap, Loader2, UserPlus, Upload, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string>('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerification, setShowVerification] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Image must be less than 2MB');
        return;
      }
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    if (!acceptedTerms) {
      setError('Please accept the Terms and Conditions');
      setLoading(false);
      return;
    }
    if (!profileImage) {
      setError('Please upload a profile picture');
      setLoading(false);
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Upload profile image to Firebase Storage
      const imageRef = storageRef(storage, `profiles/${user.uid}`);
      await uploadBytes(imageRef, profileImage);
      const profileImageUrl = await getDownloadURL(imageRef);

      // Update auth profile
      await updateProfile(user, {
        displayName: name,
        photoURL: profileImageUrl,
      });

      // Send email verification
      await sendEmailVerification(user);

      // Create user document in Firestore
      const userData = {
        uid: user.uid,
        name,
        email,
        nationalId,
        profileImageUrl,
        acceptedTerms: true,
        role: 'user',
        emailVerified: false,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      localStorage.setItem('userData', JSON.stringify(userData));

      setShowVerification(true);
    } catch (err: any) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center relative overflow-hidden py-8">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-10 w-72 h-72 bg-[#e94560]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-[#0f3460]/30 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg px-4">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-coral flex items-center justify-center shadow-lg shadow-[#e94560]/20">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <span className="text-3xl font-bold text-white tracking-tight">
            Solar<span className="text-[#e94560]">Gen</span>
          </span>
        </div>

        <Card className="bg-[#16213e]/80 backdrop-blur-xl border-[#0f3460]/50 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold text-white">Create Account</CardTitle>
            <CardDescription className="text-gray-400">
              Register to start booking solar generators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Profile Image Upload */}
              <div className="flex flex-col items-center gap-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-full bg-[#1a1a2e] border-2 border-dashed border-[#0f3460] flex items-center justify-center cursor-pointer hover:border-[#e94560] transition-all overflow-hidden"
                >
                  {profilePreview ? (
                    <img
                      src={profilePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Upload className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-[#e94560] hover:text-[#ff6b81] transition-colors"
                >
                  {profilePreview ? 'Change Photo' : 'Upload Profile Photo'}
                </button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-300">
                  Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-[#1a1a2e] border-[#0f3460] text-white placeholder:text-gray-500 focus:border-[#e94560] focus:ring-[#e94560]/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-[#1a1a2e] border-[#0f3460] text-white placeholder:text-gray-500 focus:border-[#e94560] focus:ring-[#e94560]/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nationalId" className="text-gray-300">
                  National Identity Number
                </Label>
                <Input
                  id="nationalId"
                  placeholder="e.g., 12345678901"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  required
                  className="bg-[#1a1a2e] border-[#0f3460] text-white placeholder:text-gray-500 focus:border-[#e94560] focus:ring-[#e94560]/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password" className="text-gray-300">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-[#1a1a2e] border-[#0f3460] text-white placeholder:text-gray-500 focus:border-[#e94560] focus:ring-[#e94560]/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-gray-300">
                  Confirm Password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-[#1a1a2e] border-[#0f3460] text-white placeholder:text-gray-500 focus:border-[#e94560] focus:ring-[#e94560]/20"
                />
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  className="mt-0.5 border-[#0f3460] data-[state=checked]:bg-[#e94560] data-[state=checked]:border-[#e94560]"
                />
                <div>
                  <Label htmlFor="terms" className="text-sm text-gray-300 cursor-pointer">
                    I accept the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTerms(true)}
                      className="text-[#e94560] hover:text-[#ff6b81] font-medium underline"
                    >
                      Terms and Conditions
                    </button>
                  </Label>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#e94560] hover:bg-[#d63d56] text-white font-semibold py-6 rounded-lg transition-all hover-glow"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Create Account
                  </span>
                )}
              </Button>

              <p className="text-center text-sm text-gray-400">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-[#e94560] hover:text-[#ff6b81] font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Terms and Conditions Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="bg-[#16213e] border-[#0f3460] text-white max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Terms and Conditions</DialogTitle>
            <DialogDescription className="text-gray-400">
              Please read these terms carefully before using our service.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-gray-300">
            <div>
              <h3 className="font-semibold text-white mb-2">1. Booking Terms</h3>
              <p>
                Each solar generator booking is for a 24-hour period starting from the time of
                successful payment. Late returns may incur additional charges.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">2. Payment</h3>
              <p>
                All payments are processed securely through Paystack. The base rental fee plus any
                applicable delivery charges must be paid in full before collection.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">3. Pickup and Delivery</h3>
              <p>
                Free pickup is available at our office location. Delivery service incurs an
                additional charge of ₦1,000 and must be arranged at least 24 hours in advance.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">4. Equipment Care</h3>
              <p>
                Users are responsible for the proper care and safe return of all equipment. Damage
                caused by negligence may result in additional fees.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">5. Privacy</h3>
              <p>
                We collect and store your personal information solely for the purpose of providing
                our services. We do not share your data with third parties without consent.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowTerms(false)}
            className="w-full bg-[#e94560] hover:bg-[#d63d56] text-white"
          >
            I Understand
          </Button>
        </DialogContent>
      </Dialog>

      {/* Verification Sent Dialog */}
      <Dialog open={showVerification} onOpenChange={setShowVerification}>
        <DialogContent className="bg-[#16213e] border-[#0f3460] text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">Verify Your Email</DialogTitle>
            <DialogDescription className="text-gray-400 text-center">
              We've sent a verification link to your email address. Please check your inbox and click
              the link to verify your account.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-[#e94560]/10 flex items-center justify-center">
              <Zap className="w-8 h-8 text-[#e94560]" />
            </div>
            <p className="text-sm text-gray-400 text-center">
              Once verified, you can sign in to access your dashboard.
            </p>
          </div>
          <Button
            onClick={() => navigate('/login')}
            className="w-full bg-[#e94560] hover:bg-[#d63d56] text-white"
          >
            Go to Login
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
