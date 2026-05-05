import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import tas from "@/assets/tas-kebabi.png";
import adana from "@/assets/adana-kebabi.png";
import beyti from "@/assets/beyti-kebabi.png";
import kuzu from "@/assets/kuzu-kebabi.png";
import kaburgi from "@/assets/kuzu-kaburgi.png";
import kaburga from "@/assets/kuzu-kaburga.png";

const items = [
  { img: tas, title: "Tas Kebabı", desc: "https:122444499-58912 (eddaadı", price: "280.00 TL" },
  { img: adana, title: "Tas Kebabı", desc: "Ağair ate piscimilişe dana kushası", price: "320.00 TL" },
  { img: beyti, title: "Beytı Kebabı", desc: "Lazu araisnde yonulu royulı 926", price: "320.00 TL" },
  { img: kuzu, title: "Kuzu Kebabı", desc: "Sığır habbı timamiluşd dana gerbsa şıtu.", price: "280.00 TL" },
  { img: kaburgi, title: "Kuzu Kaburgı", desc: "Wəst arennd gn 0.3 derininye", price: "320.00 TL" },
  { img: kaburga, title: "Kuzu Kaburga", desc: "Şız hn hmıt. Tit sçurglehı, tar cubr şlan clnkenitiın.", price: "900.00 TL" },
];

const Menu = () => {
  return (
    <div className="min-h-screen bg-[#e9ecef] py-10 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <Link to="/" className="text-xs text-gray-500 underline">← back</Link>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((it, i) => (
            <article
              key={i}
              className="bg-white rounded-[28px] p-6 pt-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex flex-col"
            >
              {/* Heart-shaped plate */}
              <div className="relative mx-auto w-[78%] aspect-square">
                <div
                  className="absolute inset-0 bg-white shadow-[0_18px_30px_-10px_rgba(0,0,0,0.25)]"
                  style={{
                    clipPath:
                      "path('M128,232 C128,232 16,160 16,80 C16,42 46,16 80,16 C104,16 122,30 128,52 C134,30 152,16 176,16 C210,16 240,42 240,80 C240,160 128,232 128,232 Z')",
                    WebkitClipPath:
                      "path('M128,232 C128,232 16,160 16,80 C16,42 46,16 80,16 C104,16 122,30 128,52 C134,30 152,16 176,16 C210,16 240,42 240,80 C240,160 128,232 128,232 Z')",
                  }}
                />
                <div
                  className="absolute inset-[8%] overflow-hidden"
                  style={{
                    clipPath:
                      "path('M128,232 C128,232 16,160 16,80 C16,42 46,16 80,16 C104,16 122,30 128,52 C134,30 152,16 176,16 C210,16 240,42 240,80 C240,160 128,232 128,232 Z')",
                    WebkitClipPath:
                      "path('M128,232 C128,232 16,160 16,80 C16,42 46,16 80,16 C104,16 122,30 128,52 C134,30 152,16 176,16 C210,16 240,42 240,80 C240,160 128,232 128,232 Z')",
                  }}
                >
                  <img
                    src={it.img}
                    alt={it.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={512}
                    height={512}
                  />
                </div>
                <button
                  aria-label="Favorite"
                  className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-md hover:scale-105 transition"
                >
                  <Heart className="w-5 h-5 text-gray-700" strokeWidth={1.8} />
                </button>
              </div>

              <h3 className="mt-6 text-xl font-bold text-gray-900">{it.title}</h3>
              <p className="mt-2 text-xs text-gray-500 leading-relaxed min-h-[32px]">{it.desc}</p>

              <div className="mt-6 mx-auto w-[80%] border-2 border-dashed border-[#b22a2a]/60 rounded-full py-3 text-center">
                <span className="text-[#b22a2a] font-bold tracking-wide">{it.price}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Menu;
