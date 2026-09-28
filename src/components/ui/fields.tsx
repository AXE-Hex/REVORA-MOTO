import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', ...props },
  ref,
) {
  return <input {...props} ref={ref} className={`input ${className}`.trim()} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className = '', rows = 4, ...props }, ref) {
    return (
      <textarea
        {...props}
        ref={ref}
        rows={rows}
        className={`input textarea ${className}`.trim()}
      />
    );
  },
);
