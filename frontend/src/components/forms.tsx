import type { InputHTMLAttributes, ReactNode } from 'react';
export function Field({label,children,...input}:{label:string;children?:ReactNode}&InputHTMLAttributes<HTMLInputElement>) {
  return <label className="field"><span>{label}{input.required?' *':''}</span>{children || <input {...input}/>}</label>;
}
