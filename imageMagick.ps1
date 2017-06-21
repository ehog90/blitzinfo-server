for($s=50;$s -le 1000; $s+= 50) 
{
    echo Convert $s
    #New-Item -ItemType Directory -Force -Path .\flagsConverted\png\$s
    New-Item -ItemType Directory -Force -Path .\flagsConverted\webp\$s
	$flags = Get-ChildItem .\flagsOriginal
	foreach ($flag in $flags)
	{
        $name = $flag.BaseName;
		#convert $flag.FullName -resize $s"x"$s .\flagsConverted\png\$s\$name.png
        convert $flag.FullName -resize $s"x"$s -define webp:lossless=true .\flagsConverted\webp\$s\$name.webp
	}
}

$host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")