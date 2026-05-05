import burger from "@/assets/burger.jpg";
import salad from "@/assets/chicken-salad.jpg";
import lemonade from "@/assets/strawberry-lemonade.jpg";

const items = [
  {
    img: burger,
    title: "Özel Soslu Burger",
    desc: "Izgara dana köftesi, özel sos, taze marul ve domates.",
    price: "245 TL",
  },
  {
    img: salad,
    title: "Izgara Tavuk Salatası",
    desc: "Marine edilmiş tavuk göğsü, mevsim yeşillikleri ve limon sos.",
    price: "190 TL",
  },
  {
    img: lemonade,
    title: "Çilekli Limonata",
    desc: "Taze çilek, limon, nane ve buz ile ferahlatıcı içecek.",
    price: "85 TL",
  },
];

const MenuDark = () => {
  return (
    <div className="min-h-screen bg-[#2b1f17] py-16 px-6 font-serif">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-[#b8965a] tracking-[0.4em] text-xs uppercase">Lezzet Durağı</p>
          <h1 className="mt-3 text-[#e9c98a] italic text-5xl">Menümüz</h1>
          <div className="mt-5 mx-auto w-24 h-px bg-[#b8965a]/60" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((it, i) => (
            <article
              key={i}
              className="group relative bg-[#332419] border border-[#b8965a]/40 p-5 flex flex-col transition-transform duration-300 hover:-translate-y-1 hover:border-[#e9c98a]/70"
            >
              {/* corner accents */}
              <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[#b8965a]" />
              <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[#b8965a]" />
              <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[#b8965a]" />
              <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[#b8965a]" />

              <div className="p-1.5 border border-[#b8965a]/60">
                <img
                  src={it.img}
                  alt={it.title}
                  width={512}
                  height={512}
                  loading="lazy"
                  className="w-full aspect-square object-cover"
                />
              </div>

              <h3 className="mt-6 text-[#e9c98a] italic text-2xl text-center">
                {it.title}
              </h3>

              <p className="mt-3 text-[#c9b48a]/80 text-sm text-center leading-relaxed min-h-[40px]">
                {it.desc}
              </p>

              <div className="mt-5 flex items-center gap-3">
                <span className="flex-1 h-px bg-[#b8965a]/40" />
                <span className="text-[#e9c98a] text-xl tracking-wide">{it.price}</span>
                <span className="flex-1 h-px bg-[#b8965a]/40" />
              </div>

              <button className="mt-6 mx-auto px-6 py-2 border border-[#b8965a] text-[#e9c98a] text-xs tracking-[0.3em] uppercase hover:bg-[#b8965a] hover:text-[#2b1f17] transition-colors">
                Sipariş Ver
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuDark;
