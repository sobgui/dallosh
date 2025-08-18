import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      {...props}
    >
      <rect width="256" height="256" fill="none" />
      <path
        d="M88,134.2,42.4,171.8a48,48,0,0,1-16.1-33.9L32,128,88,72Z"
        opacity="0.2"
      />
      <path
        d="M168,121.8,213.6,84.2a48,48,0,0,0,16.1,33.9L224,128,168,184Z"
        opacity="0.2"
      />
      <path
        d="M137.8,88,171.8,42.4a48,48,0,0,0-33.9-16.1L128,32,72,88Z"
        opacity="0.2"
      />
      <path
        d="M118.2,168,84.2,213.6a48,48,0,0,0,33.9,16.1L128,224l56-56Z"
        opacity="0.2"
      />
      <path
        d="M168,121.8,137.8,88,72,153.8V72L32,128l40,56h81.8Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
      <path
        d="M88,134.2,118.2,168,184,102.2V184l40-56-40-56H102.2Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="16"
      />
    </svg>
  );
}
