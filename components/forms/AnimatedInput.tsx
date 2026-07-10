import { useState, forwardRef, InputHTMLAttributes } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";

/**
 * AnimatedInput — premium replacement for plain HTML <input>.
 *
 * - Floating label that lifts on focus or when value present
 * - Animated focus ring (border color + subtle glow)
 * - Built-in validation error display
 * - Password toggle for type="password"
 *
 * Used by AuthCard (login/signup), profile forms, and anywhere else
 * the V1/premium gate (rule 33.4) requires non-default form controls.
 */

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: string;
};

const AnimatedInput = forwardRef<HTMLInputElement, Props>(function AnimatedInput(
  { label, value, onChange, error, hint, type = "text", placeholder, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const lifted = focused || value.length > 0;
  const isPassword = type === "password";
  const effectiveType = isPassword && showPassword ? "text" : type;
  
  return (
    <div className="relative">
      <div
        className={`relative bg-bg/30 border rounded-lg transition-all ${
          error
            ? "border-red-500/60"
            : focused
              ? "border-primary shadow-[0_0_0_3px_rgba(var(--primary-rgb),0.1)]"
              : "border-border/40 hover:border-border/70"
        }`}
      >
        <motion.label
          animate={{
            y: lifted ? -8 : 0,
            scale: lifted ? 0.85 : 1,
            color: focused ? "var(--primary)" : "var(--text-secondary)",
          }}
          transition={{ duration: 0.15 }}
          style={{ originX: 0 }}
          className={`absolute left-4 pointer-events-none font-mono ${
            lifted
              ? "top-1.5 text-[10px] uppercase tracking-[0.2em]"
              : "top-3.5 text-sm tracking-normal"
          }`}
        >
          {label}
        </motion.label>
        
        <input
          ref={ref}
          type={effectiveType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={lifted ? placeholder : ""}
          className="w-full px-4 pt-6 pb-2 bg-transparent text-sm outline-none"
          {...rest}
        />
        
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-red-500 mt-1.5 px-1"
          >
            {error}
          </motion.p>
        )}
        {!error && hint && lifted && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-text-secondary mt-1.5 px-1"
          >
            {hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

export default AnimatedInput;
