import { Logo } from "./logo";

/**
 * Short splash with Sigma's motto when the app is opened. Pure CSS: it fades out
 * by itself and never blocks taps. Shown once per app session; the inline script
 * hides it on later full reloads in the same session.
 */
export function Splash({ slogan }: { slogan: string }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: "try{if(sessionStorage.getItem('sigma-splash'))document.documentElement.classList.add('no-splash');else sessionStorage.setItem('sigma-splash','1')}catch(e){}",
        }}
      />
      <div aria-hidden="true" className="splash pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg px-8">
        <Logo className="splash-logo size-20" />
        <p className="splash-text mt-6 text-center text-[22px] leading-tight font-semibold tracking-tight">{slogan}</p>
        <p className="splash-text mt-2 text-xs tracking-[0.3em] text-faint uppercase">Sigma</p>
      </div>
    </>
  );
}
