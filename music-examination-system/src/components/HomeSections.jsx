import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowDown,ArrowUpRight} from 'lucide-react';
import {portalRequest} from '../auth/api.js';
import {faqs} from '../data/faqs.js';
import '../styles/home-sections.css';
const subjects=[
 ['Bharathanatyam','bharathanatyam','Grace, rhythm and storytelling through classical dance.'],
 ['Veena','veena','Discover the expressive voice of this traditional string instrument.'],
 ['Miruthangam','miruthangam','Build rhythm, precision and musical confidence.'],
 ['Violin','violin','Explore melody, bowing and expressive performance.'],
 ['Vocal','vocal','Develop your voice through attentive listening and practice.'],
 ['Pann Isai','pann-isai','Celebrate the rich tradition of Tamil musical expression.'],
 ['Flute','flute','Explore breath, melody and the warmth of bamboo flute.'],
 ['Tamil Language','tamil-language','Connect with Tamil through language, literature and culture.'],
];
export default function HomeSections(){const[about,setAbout]=useState(null);useEffect(()=>{let active=true;portalRequest('about').then(data=>active&&setAbout(data)).catch(()=>{});return()=>{active=false;};},[]);return <>
<section className="home-about page-shell home-anchor" id="about" aria-labelledby="home-about-title"><div className="home-about-copy"><span className="eyebrow">OUR STORY</span><h2 id="home-about-title">About Us</h2><p>{about?.content||'Ensemble brings students, families and teachers together through music, dance and Tamil learning. We support meaningful practice and celebrate each step of your progress.'}</p><a className="home-section-link" href="#subjects">Discover our subjects <ArrowDown size={17}/></a></div><div className="home-about-notes">{(about?.sections||[{title:'Learn with purpose',content:'A clear path through learning, practice and examinations.'},{title:'Celebrate your progress',content:'A permanent student account connects every stage of your journey.'}]).map(s=><article key={s.title}><h3>{s.title}</h3><p>{s.content}</p></article>)}</div></section>
<section className="home-subjects page-shell home-anchor" id="subjects" aria-labelledby="home-subjects-title"><div className="home-section-heading"><div><span className="eyebrow">MUSIC · DANCE · LANGUAGE</span><h2 id="home-subjects-title">Explore Our Subjects</h2></div><p>Eight paths to discovery. Find the subject that speaks to you.</p></div><div className="home-subject-grid">{subjects.map(([name,id,intro],index)=><article className="home-subject-card" key={id}><div className={'home-subject-photo '+id}><img src={'/home-subjects/'+id+'.jpg'} alt={name==='Vocal'?'Vocal singer performing with a microphone':name==='Pann Isai'?'Pann Isai singer holding a traditional instrument':name+' subject'} loading="lazy"/></div><div className="home-subject-copy"><span className="home-subject-number">0{index+1}</span><h3>{name}</h3><p>{intro}</p><Link to="/register">Begin your journey <ArrowUpRight size={17}/></Link></div></article>)}</div></section>
<section className="home-faq page-shell home-anchor" id="faq" aria-labelledby="home-faq-title"><span className="eyebrow">HERE TO HELP</span><h2 id="home-faq-title">Frequently Asked Questions</h2><div className="home-faq-list">{faqs.slice(0,4).map((item,i)=><details key={i}><summary>{item.question||item.title}</summary><p>{item.answer||item.content}</p></details>)}</div><Link className="home-section-link" to="/faq">View all FAQs <ArrowUpRight size={17}/></Link></section>
<section className="home-contact page-shell home-anchor" id="contact" aria-labelledby="home-contact-title"><div><span className="eyebrow">LET’S CONNECT</span><h2 id="home-contact-title">Your next chapter starts here.</h2><p>Have a question about subjects, registration or examinations? We’re here to help.</p></div><Link className="btn btn-primary" to="/contact">Get in touch <ArrowUpRight size={17}/></Link></section>
</>}
