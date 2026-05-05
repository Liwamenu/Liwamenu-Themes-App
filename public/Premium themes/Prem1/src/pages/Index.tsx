import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, ArrowRight, Star, Clock, Bell, LayoutGrid, Heart, MessageCircle } from "lucide-react";
import avatar from "@/assets/avatar.jpg";
import shrimp from "@/assets/shrimp.jpg";
import salad from "@/assets/salad.jpg";

const categories = [
  { icon: "🍔", label: "Burger" },
  { icon: "🍕", label: "Pizza" },
  { icon: "🥪", label: "Sandw" },
];

const dishes = [
  { name: "Fried Shrimp", img: shrimp, rating: "4.8(163)", time: "20 min", price: "$29.00" },
  { name: "Fried Shrimp", img: salad, rating: "4.8(163)", time: "20 min", price: "$29.00" },
  { name: "Fried Shrimp", img: shrimp, rating: "4.8(163)", time: "20 min", price: "$29.00" },
  { name: "Fried Shrimp", img: salad, rating: "4.8(163)", time: "20 min", price: "$29.00" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-[#1a1d21] flex items-center justify-center p-4">
      <div className="w-full max-w-[380px] bg-[#22262b] rounded-[28px] overflow-hidden shadow-2xl text-white relative pb-20">
        <div className="px-5 pt-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400">Good morning</p>
              <h1 className="text-2xl font-semibold mt-1">Shania fraser</h1>
            </div>
            <div className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-orange-500">
              <img src={avatar} alt="avatar" className="w-full h-full object-cover" width={44} height={44} />
            </div>
          </div>

          {/* Search */}
          <div className="mt-5 flex items-center gap-2 bg-[#2c3036] rounded-2xl px-4 py-3.5">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              placeholder="Find your dishes"
              className="bg-transparent flex-1 outline-none text-sm placeholder:text-gray-500"
            />
            <SlidersHorizontal className="w-4 h-4 text-orange-500" />
          </div>

          {/* Categories */}
          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Categories</h2>
            <button className="text-xs text-gray-400 flex items-center gap-1">
              All <ArrowRight className="w-3 h-3 text-orange-500" />
            </button>
          </div>

          <div className="mt-3 flex gap-2.5">
            {categories.map((c) => (
              <div key={c.label} className="flex-1 bg-[#2c3036] rounded-xl px-3 py-2.5 flex items-center gap-2">
                <span className="text-lg">{c.icon}</span>
                <span className="text-xs font-medium truncate">{c.label}</span>
              </div>
            ))}
          </div>

          {/* New dishes */}
          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">New dishes</h2>
            <button className="text-xs text-gray-400 flex items-center gap-1">
              All <ArrowRight className="w-3 h-3 text-orange-500" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {dishes.map((d, i) => (
              <div key={i} className="bg-[#2c3036] rounded-2xl p-3">
                <div className="aspect-square w-full overflow-hidden rounded-xl bg-black flex items-center justify-center">
                  <img src={d.img} alt={d.name} className="w-full h-full object-cover" loading="lazy" width={512} height={512} />
                </div>
                <h3 className="mt-2 text-sm font-semibold">{d.name}</h3>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><Star className="w-2.5 h-2.5 fill-orange-500 text-orange-500" />{d.rating}</span>
                  <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{d.time}</span>
                </div>
                <p className="mt-1.5 text-orange-500 font-bold text-sm">{d.price}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 bg-[#22262b] border-t border-white/5 px-8 py-4 flex items-center justify-between">
          <div className="flex flex-col items-center gap-1">
            <Bell className="w-5 h-5 text-orange-500" />
            <span className="w-1 h-1 rounded-full bg-orange-500" />
          </div>
          <LayoutGrid className="w-5 h-5 text-gray-500" />
          <Heart className="w-5 h-5 text-gray-500" />
          <MessageCircle className="w-5 h-5 text-gray-500" />
        </div>

        <Link to="/menu" className="absolute top-4 right-20 text-[10px] text-gray-500 underline">menu →</Link>
      </div>
    </div>
  );
};

export default Index;
