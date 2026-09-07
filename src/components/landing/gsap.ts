import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { TextPlugin } from "gsap/TextPlugin";

gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin, ScrollTrigger, SplitText, TextPlugin);

export { gsap, DrawSVGPlugin, MotionPathPlugin, ScrollTrigger, SplitText, TextPlugin };
