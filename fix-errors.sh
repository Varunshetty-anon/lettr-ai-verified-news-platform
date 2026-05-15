files=(
  "./app/api/user/follow/route.ts"
  "./app/api/user/interact/route.ts"
  "./app/api/user/me/route.ts"
  "./app/api/user/preferences/route.ts"
  "./app/api/authors/top/route.ts"
  "./app/api/authors/[id]/route.ts"
  "./app/api/verify-author/route.ts"
  "./app/api/publish/route.ts"
  "./app/api/posts/[id]/route.ts"
  "./app/api/posts/route.ts"
  "./app/api/posts/categories/route.ts"
  "./app/api/auth/signup/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    sed -i 's/} catch (error: any) {/} catch (error: unknown) {/g' "$file"
    sed -i 's/} catch (e: any) {/} catch (e: unknown) {/g' "$file"
    sed -i 's/return NextResponse.json({ error: error.message }/const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";\n    return NextResponse.json({ error: errorMessage }/g' "$file"
    sed -i 's/return NextResponse.json({ error: error.message ||/const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";\n    return NextResponse.json({ error: errorMessage ||/g' "$file"
    sed -i 's/return NextResponse.json({ error: e.message }/const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";\n    return NextResponse.json({ error: errorMessage }/g' "$file"
  fi
done
