import urllib.request, io, os
from PIL import Image

CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_3BntxHKZDLZTrYiVcjRVSeMoqjH/"
JOBS = {
    "kaelis":     "hf_20260713_083704_e83e7dcd-5cd0-44c3-ac50-a5f8c8d42636.png",
    "bramble":    "hf_20260713_083706_22521f34-5a59-4b65-a7be-0ade942736f2.png",
    "maelle":     "hf_20260713_083709_5b37f018-1abc-45de-961b-095ab49b7e14.png",
    "sorren":     "hf_20260713_083712_357a67b7-1109-4a66-b553-952799725325.png",
    "grondin":    "hf_20260713_083730_56eb0a7b-dcad-4a36-8983-e94b02ceda2a.png",
    "vesperine":  "hf_20260713_083733_93ae9caa-748f-4d7f-a39a-a157a8eb9724.png",
    "pipbogue":   "hf_20260713_083733_5ea408d4-bbd9-4fda-ade4-cbdc7d055b80.png",
    "sylvarende": "hf_20260713_083743_25de8f65-0140-40aa-897e-7b11132a5bfa.png",
    "theoline":   "hf_20260713_083744_6bbf3d40-ccbc-4f41-aca3-993763e639f2.png",
    "nhyx":       "hf_20260713_083745_f6ebdfae-93dc-4c1e-a9a2-52b15ce29f6c.png",
}
BIOMES = {
    "zenith": "hf_20260713_091702_d8a24023-1e03-45ec-b975-ac53fbbf5962.png",
    "sylve":  "hf_20260713_091706_931c8f41-35d1-4502-9da9-14756de417a4.png",
    "forge":  "hf_20260713_091709_11ba0def-6565-407e-bb7c-513d5fc0ee3f.png",
    "maree":  "hf_20260713_091723_f8948063-cb6f-4657-93e1-9ffaad891886.png",
    "voile":  "hf_20260713_091727_f44894db-61cf-45fd-ac40-6367ce576024.png",
}
KEYART = "hf_20260713_083746_eb2eed09-31ee-4266-82e4-521d2328eb8e.png"
ICON   = "hf_20260713_083748_3adef38b-8f83-4506-b56a-6fcd69832b79.png"

os.makedirs("assets/portraits", exist_ok=True)
os.makedirs("assets/biomes", exist_ok=True)

def get(name):
    with urllib.request.urlopen(CDN + name, timeout=60) as r:
        return Image.open(io.BytesIO(r.read())).convert("RGB")

for hid, fn in JOBS.items():
    if os.path.exists(f"assets/portraits/{hid}.jpg"):
        continue
    im = get(fn).resize((512, 512), Image.LANCZOS)
    im.save(f"assets/portraits/{hid}.jpg", quality=82, optimize=True)
    print(hid, os.path.getsize(f"assets/portraits/{hid}.jpg") // 1024, "Ko")

for bid, fn in BIOMES.items():
    if os.path.exists(f"assets/biomes/{bid}.jpg"):
        continue
    im = get(fn)
    im = im.resize((720, round(im.height * 720 / im.width)), Image.LANCZOS)
    im.save(f"assets/biomes/{bid}.jpg", quality=80, optimize=True)
    print("biome", bid, os.path.getsize(f"assets/biomes/{bid}.jpg") // 1024, "Ko")

if not os.path.exists("assets/keyart.jpg"):
    ka = get(KEYART)
    ka = ka.resize((1024, round(ka.height * 1024 / ka.width)), Image.LANCZOS)
    ka.save("assets/keyart.jpg", quality=82, optimize=True)
    print("keyart", os.path.getsize("assets/keyart.jpg") // 1024, "Ko")

if not os.path.exists("assets/icon.png"):
    ic = get(ICON).resize((512, 512), Image.LANCZOS)
    ic.save("assets/icon.png", optimize=True)
    print("icon", os.path.getsize("assets/icon.png") // 1024, "Ko")

# planche-contact pour vérification visuelle du style
sheet = Image.new("RGB", (5 * 256, 2 * 256), (20, 16, 40))
for i, hid in enumerate(JOBS):
    im = Image.open(f"assets/portraits/{hid}.jpg").resize((256, 256))
    sheet.paste(im, ((i % 5) * 256, (i // 5) * 256))
sheet.save("tools/contact_sheet.jpg", quality=85)
print("contact sheet ok")

# --- références 3D (QC visuel avant reconstruction ; hors zip, commité pour inspection) ---
CONCEPTS = {
    "kaelis":     "hf_20260713_093045_af96d1b5-6d53-4449-b29e-66ee7fdfa3bc.png",
    "bramble":    "hf_20260713_093048_0bfe6adc-dec2-4375-be4a-d173f09b9864.png",
    "maelle":     "hf_20260713_093051_71776e6a-9908-4700-a493-2502fbfa70e7.png",
    "sorren":     "hf_20260713_093055_61af3f2c-b71e-463a-b580-07594c7196af.png",
    "grondin":    "hf_20260713_093059_60e0efe6-1930-4ef8-a352-a6ac2489df86.png",
    "vesperine":  "hf_20260713_093101_8fc00534-cd0c-4359-b269-be0c154b95dc.png",
    "pipbogue":   "hf_20260713_093104_96b441b0-11d8-47ad-a4aa-4c4f2ba83dd6.png",
    "sylvarende": "hf_20260713_132456_9af790a0-88cb-48ad-a2b1-489faee782ca.png",
    "theoline":   "hf_20260713_132459_e6914cd0-31c2-4be5-add0-01b612d2846f.png",
    "nhyx":       "hf_20260713_132502_5ea2bdb4-2a18-4932-8686-0de9921a474d.png",
}
os.makedirs("tools/concepts", exist_ok=True)
sheet2 = Image.new("RGB", (5 * 256, 2 * 256), (255, 255, 255))
for i, (hid, fn) in enumerate(CONCEPTS.items()):
    p = f"tools/concepts/{hid}.jpg"
    im = (Image.open(p) if os.path.exists(p) else get(fn).resize((256, 256), Image.LANCZOS))
    if not os.path.exists(p):
        im.save(p, quality=80)
    sheet2.paste(im.resize((256, 256)), ((i % 5) * 256, (i // 5) * 256))
sheet2.save("tools/concepts_sheet.jpg", quality=85)
print("concepts sheet ok")

# --- modèles 3D des héros (GLB statiques, optimisés ensuite par gltf-transform) ---
CDN3D = "https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/"
MODELS3D = {
    "kaelis":     "88612907-8763-4323-9716-cbcfaf5d8ac0.glb",
    "bramble":    "2e2b7184-8d64-458e-92b9-1832db0fab6d.glb",
    "maelle":     "a6825718-d1c6-4127-87f3-96ec1a28b4e0.glb",
    "sorren":     "052d02ee-4bb0-4b6e-9f06-cbf8cbf6b8cb.glb",
    "grondin":    "7adf5e1f-f864-4cd6-ac72-d506aa06462c.glb",
    "vesperine":  "38f4c1cc-10c7-408f-973f-7face6411f3d.glb",
    "pipbogue":   "ecb806dd-5c2c-4b6f-9ae1-56864aa97d78.glb",
    "sylvarende": "6fd2e3ec-d8a4-4adb-a411-b3fc3b22aea0.glb",
    "theoline":   "a5383847-4896-4cd7-bed1-3b33db4c2a15.glb",
    "nhyx":       "4ba4faad-f719-4295-9e13-ea64df8e8a57.glb",
    "brume_loup":         "1055323d-5eec-4f72-9f53-ef3781679a46.glb",
    "brume_golem":        "a11a389a-0f36-47d8-a93e-78907c7f3bae.glb",
    "brume_corbeau":      "3fdd2b61-11a8-4e9e-a3fb-27d0adfa7ffa.glb",
    "brume_meduse":       "a866c187-88eb-418b-ade0-fac71bb9f127.glb",
    "brume_aragne":       "20b54369-1d6b-43fd-b972-744e8d14c4e2.glb",
    "brume_sanglier":     "30c76c76-254b-4db3-bd76-5637b5b2ddf8.glb",
    "devoreur_leviathan": "3f75484e-f9d0-4291-abd2-edc97b94c927.glb",
    "devoreur_tisseuse":  "c5c58975-d56d-4c23-b17f-722b87a07c94.glb",
    "devoreur_avale":     "fad08416-7b93-4113-bdc1-e9e5421c5ff1.glb",
}
os.makedirs("assets/models", exist_ok=True)
for hid, fn in MODELS3D.items():
    if os.path.exists(f"assets/models/{hid}.glb"):
        continue
    with urllib.request.urlopen(CDN3D + fn, timeout=120) as r:
        data = r.read()
    with open(f"assets/models/{hid}.glb", "wb") as f:
        f.write(data)
    print("model", hid, len(data) // 1024, "Ko")

# --- créatures de la Brume : références 3D → portraits en jeu + planche QC ---
CREATURE_CONCEPTS = {
    "brume_loup":          "hf_20260713_141931_3e821622-7b4c-4b41-95fa-3564cea8f6df.png",
    "brume_golem":         "hf_20260713_141934_12fed5d4-24f2-4a80-b0c1-ad50b1b8f232.png",
    "brume_corbeau":       "hf_20260713_141937_3c6dd412-139c-42ac-8f73-ec57c37462d6.png",
    "brume_meduse":        "hf_20260713_141941_b1cee78b-7d65-4641-b77d-f4100547011a.png",
    "brume_aragne":        "hf_20260713_141945_dadec356-eb29-4c23-9ef7-bfd87a0cd04a.png",
    "brume_sanglier":      "hf_20260713_141948_2607a95f-b297-4fd0-abe7-30849ba3fd26.png",
    "devoreur_leviathan":  "hf_20260713_142538_32897415-0f31-4acf-ae43-c41ae9001625.png",
    "devoreur_tisseuse":   "hf_20260713_141954_0fb99301-78a0-4317-9b9a-9c6cfb26fceb.png",
    "devoreur_avale":      "hf_20260713_141959_17852915-2b5b-420d-83f9-36ba2011e67c.png",
}
sheet3 = Image.new("RGB", (5 * 256, 2 * 256), (255, 255, 255))
for i, (cid, fn) in enumerate(CREATURE_CONCEPTS.items()):
    p = f"assets/portraits/{cid}.jpg"
    if os.path.exists(p):
        im = Image.open(p)
    else:
        im = get(fn).resize((512, 512), Image.LANCZOS)
        im.save(p, quality=82, optimize=True)
        print("créature", cid, os.path.getsize(p) // 1024, "Ko")
    sheet3.paste(im.resize((256, 256)), ((i % 5) * 256, (i // 5) * 256))
sheet3.save("tools/creatures_sheet.jpg", quality=85)
print("creatures sheet ok")
