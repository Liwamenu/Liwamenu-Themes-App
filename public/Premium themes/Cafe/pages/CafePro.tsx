import { Link } from "react-router-dom";
import { Bell, Search, ShoppingBag, ChevronDown, Clock, Wifi, MapPin, MessageSquare, Instagram, Facebook } from "lucide-react";
import logo from "@/assets/cafe-logo.png";
import bg from "@/assets/cafe-bg.jpg";
import drinks from "@/assets/cafe-drinks.jpg";
import soup from "@/assets/cafe-soup.jpg";
import dessert from "@/assets/cafe-dessert.jpg";
import home from "@/assets/cafe-homefood.jpg";
import salad from "@/assets/cafe-salad.jpg";
import pasta from "@/assets/cafe-pasta.jpg";

const menus = [
  { img: drinks, label: "İçecekler" },
  { img: soup, label: "Çorbalar" },
  { img: dessert, label: "Tatlılar" },
  { img: home, label: "Ev Yemekleri" },
  { img: salad, label: "Salatalar" },
  { img: pasta, label: "Makarnalar" },
];

const Pill = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <button className={`flex items-center gap-1.5 bg-white/10 backdrop-blur-md text-white text-xs font-medium px-3 py-2 rounded-full border border-white/10 ${className}`}>
    {children}
  </button>
);

const CafePro = () => {
  return (
    <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] bg-white rounded-[40px] overflow-hidden shadow-2xl relative">
        {/* Hero with bg */}
        <div className="relative">
          <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover" width={768} height={1024} />
          <div className="absolute inset-0 bg-black/55" />
          <div className="relative px-5 pt-10 pb-10">
            {/* Top row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                <Pill>TR <ChevronDown className="w-3 h-3" /></Pill>
                <Pill>₺ <ChevronDown className="w-3 h-3" /></Pill>
              </div>
              <div className="flex gap-2">
                <Pill className="!px-4"><Bell className="w-3.5 h-3.5" /> Garson Çağır</Pill>
                <Pill className="!p-2"><Search className="w-4 h-4" /></Pill>
                <Pill className="!p-2"><ShoppingBag className="w-4 h-4" /></Pill>
              </div>
            </div>

            {/* Brand */}
            <div className="mt-8 flex items-center gap-4">
              <img src={logo} alt="Cafe PRO" width={88} height={88} className="w-22 h-22 rounded-2xl object-cover" />
              <div>
                <h1 className="text-white text-3xl font-bold tracking-tight">Cafe PRO</h1>
                <p className="text-white/80 italic text-sm mt-1">Kalitenin Adresi..</p>
              </div>
            </div>

            {/* Info pills */}
            <div className="mt-6 flex gap-2 flex-wrap">
              <Pill className="!bg-white/15"><Clock className="w-3.5 h-3.5 text-emerald-400" /> 09:00 - 21:00</Pill>
              <Pill><Wifi className="w-3.5 h-3.5" /> Wifi</Pill>
              <Pill><MapPin className="w-3.5 h-3.5" /> Konum</Pill>
            </div>

            {/* Socials */}
            <div className="mt-5 flex items-center gap-2.5">
              <a className="w-11 h-11 rounded-full bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400 flex items-center justify-center text-white"><Instagram className="w-5 h-5" /></a>
              <a className="w-11 h-11 rounded-full bg-[#1877F2] flex items-center justify-center text-white"><Facebook className="w-5 h-5 fill-white" /></a>
              <a className="w-11 h-11 rounded-full bg-black flex items-center justify-center text-white font-bold">𝕏</a>
              <a className="w-11 h-11 rounded-full bg-[#25D366] flex items-center justify-center text-white text-lg">✆</a>
              <Pill className="ml-1 !px-4 !py-2.5"><MessageSquare className="w-3.5 h-3.5" /> Öneri / Şikayet</Pill>
            </div>
          </div>
        </div>

        {/* Menu section */}
        <div className="bg-white rounded-t-[32px] -mt-6 relative px-5 pt-7 pb-8">
          <h2 className="text-neutral-400 tracking-[0.25em] text-xs font-semibold mb-4">MENÜLER</h2>
          <div className="grid grid-cols-2 gap-3.5">
            {menus.map((m) => (
              <div key={m.label} className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-sm">
                <img src={m.img} alt={m.label} loading="lazy" width={512} height={512} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <span className="absolute inset-x-0 bottom-3 text-center text-white font-bold text-lg drop-shadow">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        <Link to="/" className="absolute top-2 right-3 text-[10px] text-white/40 underline">home</Link>
      </div>
    </div>
  );
};

export default CafePro;
